"""
Tests for predictor.pubmed_client -- backs GET /research-papers/.

Exercises the three untested areas identified in the coverage report:
  1. _esearch() / _efetch() -- the real PubMed network calls, mocked via
     unittest.mock.patch('requests.get', ...) at the predictor.pubmed_client
     import site so no real HTTP request is ever made.
  2. Caching logic in get_research_papers() -- TTL hit/miss, cache-key
     scoping.
  3. _build_query() helper paths not exercised by the views tests.
  4. _full_text(), _base_params(), and edge cases in _efetch() XML parsing.

The allow-list validation in get_research_papers() is already covered by
test_views.py (ResearchPapersViewTests) — it is not re-duplicated here.

Plain unittest.TestCase throughout (no Django client or DB needed).
"""

import time
from xml.etree import ElementTree
from unittest import TestCase
from unittest.mock import MagicMock, patch

import predictor.pubmed_client as pc
from predictor.pubmed_client import (
    ABSTRACT_EXCERPT_CHARS,
    CACHE_TTL_SECONDS,
    GENERIC_NAME_MAP,
    MAX_RESULTS,
    _base_params,
    _build_query,
    _efetch,
    _esearch,
    _full_text,
    get_research_papers,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_mock_response(json_data=None, content=None, status_code=200):
    """Returns a mock requests.Response."""
    mock = MagicMock()
    mock.status_code = status_code
    mock.raise_for_status = MagicMock()  # no-op for 200
    if json_data is not None:
        mock.json.return_value = json_data
    if content is not None:
        mock.content = content
    return mock


def _build_pubmed_xml(articles):
    """
    Builds a minimal PubMed efetch XML string from a list of dicts:
      {pmid, title, journal, year, abstract}
    Missing keys are simply omitted from the XML element tree.
    """
    root = ElementTree.Element('PubmedArticleSet')
    for art in articles:
        pa = ElementTree.SubElement(root, 'PubmedArticle')
        medline = ElementTree.SubElement(pa, 'MedlineCitation')
        article_el = ElementTree.SubElement(medline, 'Article')

        if 'pmid' in art:
            pmid_el = ElementTree.SubElement(medline, 'PMID')
            pmid_el.text = art['pmid']

        if 'title' in art:
            title_el = ElementTree.SubElement(article_el, 'ArticleTitle')
            title_el.text = art['title']

        if 'journal' in art:
            journal_parent = ElementTree.SubElement(article_el, 'Journal')
            journal_el = ElementTree.SubElement(journal_parent, 'Title')
            journal_el.text = art['journal']

        pub_info = ElementTree.SubElement(medline, 'Article')  # nested under MedlineCitation
        pub_date = ElementTree.SubElement(pa, 'PubmedData')
        history = ElementTree.SubElement(pub_date, 'History')

        # Put PubDate inside MedlineJournalInfo -> JournalIssue path that
        # _efetch actually queries: .//PubDate/Year
        jissue = ElementTree.SubElement(article_el, 'Journal')
        jinfo = ElementTree.SubElement(jissue, 'JournalIssue')
        pubdate_el = ElementTree.SubElement(jinfo, 'PubDate')
        if 'year' in art:
            year_el = ElementTree.SubElement(pubdate_el, 'Year')
            year_el.text = str(art['year'])

        if 'abstract' in art:
            abstract_el = ElementTree.SubElement(article_el, 'AbstractText')
            abstract_el.text = art['abstract']

    return ElementTree.tostring(root, encoding='unicode').encode()


# ---------------------------------------------------------------------------
# _full_text
# ---------------------------------------------------------------------------

class FullTextTests(TestCase):
    def test_returns_none_for_none_element(self):
        self.assertIsNone(_full_text(None))

    def test_returns_plain_text_from_element_without_nested_tags(self):
        el = ElementTree.fromstring('<Title>Ciprofloxacin resistance</Title>')
        self.assertEqual(_full_text(el), 'Ciprofloxacin resistance')

    def test_concatenates_text_across_nested_italic_tags(self):
        # Simulates <ArticleTitle>Resistance in <i>E. coli</i> strains</ArticleTitle>
        el = ElementTree.fromstring('<ArticleTitle>Resistance in <i>E. coli</i> strains</ArticleTitle>')
        result = _full_text(el)
        self.assertIn('E. coli', result)
        self.assertIn('Resistance in', result)
        self.assertIn('strains', result)

    def test_strips_leading_and_trailing_whitespace(self):
        el = ElementTree.fromstring('<Title>  AMR study  </Title>')
        self.assertEqual(_full_text(el), 'AMR study')


# ---------------------------------------------------------------------------
# _build_query
# ---------------------------------------------------------------------------

class BuildQueryTests(TestCase):
    def test_returns_none_for_an_antibiotic_not_in_the_generic_name_map(self):
        self.assertIsNone(_build_query('UNKNOWN_DRUG', None))

    def test_includes_all_mapped_names_joined_with_or(self):
        # AMX/AMP maps to ['Amoxicillin', 'Ampicillin']
        query = _build_query('AMX/AMP', None)
        self.assertIn('"Amoxicillin"[Title/Abstract]', query)
        self.assertIn('"Ampicillin"[Title/Abstract]', query)
        self.assertIn(' OR ', query)

    def test_always_includes_antibiotic_resistance_clause(self):
        query = _build_query('CIP', None)
        self.assertIn('"antibiotic resistance"[Title/Abstract]', query)

    def test_omits_organism_clause_when_organism_is_none(self):
        query = _build_query('CIP', None)
        self.assertNotIn('AND "', query.split('"antibiotic resistance"')[1])

    def test_omits_organism_clause_when_organism_is_all(self):
        query = _build_query('CIP', 'all')
        self.assertNotIn('[Title/Abstract]', query.replace('"antibiotic resistance"[Title/Abstract]', '').replace('"Ciprofloxacin"[Title/Abstract]', ''))

    def test_includes_organism_clause_for_a_specific_organism(self):
        query = _build_query('CIP', 'Escherichia coli')
        self.assertIn('"Escherichia coli"[Title/Abstract]', query)

    def test_strips_spp_suffix_from_organism_before_adding_to_query(self):
        query = _build_query('GEN', 'Citrobacter spp.')
        self.assertIn('"Citrobacter"[Title/Abstract]', query)
        self.assertNotIn('spp.', query)

    def test_single_name_mapping_does_not_include_or(self):
        # CIP -> ['Ciprofloxacin'] (single name)
        query = _build_query('CIP', None)
        drug_part = query.split(') AND')[0]
        self.assertNotIn(' OR ', drug_part)


# ---------------------------------------------------------------------------
# _base_params
# ---------------------------------------------------------------------------

class BaseParamsTests(TestCase):
    def test_always_includes_tool_and_email(self):
        params = _base_params()
        self.assertIn('tool', params)
        self.assertIn('email', params)

    def test_includes_api_key_when_module_api_key_is_set(self):
        with patch.object(pc, 'API_KEY', 'test-pubmed-key'):
            params = _base_params()
        self.assertIn('api_key', params)
        self.assertEqual(params['api_key'], 'test-pubmed-key')

    def test_omits_api_key_when_module_api_key_is_empty(self):
        with patch.object(pc, 'API_KEY', ''):
            params = _base_params()
        self.assertNotIn('api_key', params)


# ---------------------------------------------------------------------------
# _esearch
# ---------------------------------------------------------------------------

class EsearchTests(TestCase):
    def test_returns_idlist_from_json_response(self):
        fake_json = {'esearchresult': {'idlist': ['12345', '67890']}}
        mock_resp = _make_mock_response(json_data=fake_json)

        with patch('predictor.pubmed_client.requests.get', return_value=mock_resp) as mock_get:
            result = _esearch('some query')

        self.assertEqual(result, ['12345', '67890'])
        call_kwargs = mock_get.call_args
        # Should have passed 'sort': 'date' and 'retmax': MAX_RESULTS
        params = call_kwargs[1]['params']
        self.assertEqual(params['sort'], 'date')
        self.assertEqual(params['retmax'], MAX_RESULTS)
        self.assertEqual(params['retmode'], 'json')

    def test_returns_empty_list_when_esearchresult_is_absent(self):
        mock_resp = _make_mock_response(json_data={})

        with patch('predictor.pubmed_client.requests.get', return_value=mock_resp):
            result = _esearch('some query')

        self.assertEqual(result, [])

    def test_calls_raise_for_status(self):
        mock_resp = _make_mock_response(json_data={'esearchresult': {'idlist': []}})

        with patch('predictor.pubmed_client.requests.get', return_value=mock_resp):
            _esearch('q')

        mock_resp.raise_for_status.assert_called_once()

    def test_passes_query_as_term_param(self):
        mock_resp = _make_mock_response(json_data={'esearchresult': {'idlist': []}})

        with patch('predictor.pubmed_client.requests.get', return_value=mock_resp) as mock_get:
            _esearch('ciprofloxacin resistance')

        params = mock_get.call_args[1]['params']
        self.assertEqual(params['term'], 'ciprofloxacin resistance')


# ---------------------------------------------------------------------------
# _efetch
# ---------------------------------------------------------------------------

class EfetchTests(TestCase):
    def test_returns_empty_list_for_empty_pmids(self):
        result = _efetch([])
        self.assertEqual(result, [])

    def test_parses_a_single_article_from_xml(self):
        xml_bytes = _build_pubmed_xml([
            {'pmid': '11111', 'title': 'AMR in E. coli', 'journal': 'Lancet', 'year': 2024,
             'abstract': 'This study examines resistance.'},
        ])
        mock_resp = _make_mock_response(content=xml_bytes)

        with patch('predictor.pubmed_client.requests.get', return_value=mock_resp):
            papers = _efetch(['11111'])

        self.assertEqual(len(papers), 1)
        paper = papers[0]
        self.assertEqual(paper['pmid'], '11111')
        self.assertIn('AMR', paper['title'])
        self.assertEqual(paper['journal'], 'Lancet')
        self.assertEqual(paper['url'], 'https://pubmed.ncbi.nlm.nih.gov/11111/')

    def test_skips_articles_missing_pmid_or_title(self):
        """Articles without both PMID and Title should be silently skipped."""
        # Build XML with one complete article and one that has no title element
        root = ElementTree.Element('PubmedArticleSet')

        # Article 1: good — has pmid + title
        pa1 = ElementTree.SubElement(root, 'PubmedArticle')
        mc1 = ElementTree.SubElement(pa1, 'MedlineCitation')
        ElementTree.SubElement(mc1, 'PMID').text = '22222'
        art1 = ElementTree.SubElement(mc1, 'Article')
        ElementTree.SubElement(art1, 'ArticleTitle').text = 'Good Article'

        # Article 2: missing title element
        pa2 = ElementTree.SubElement(root, 'PubmedArticle')
        mc2 = ElementTree.SubElement(pa2, 'MedlineCitation')
        ElementTree.SubElement(mc2, 'PMID').text = '33333'
        # no ArticleTitle

        xml_bytes = ElementTree.tostring(root)
        mock_resp = _make_mock_response(content=xml_bytes)

        with patch('predictor.pubmed_client.requests.get', return_value=mock_resp):
            papers = _efetch(['22222', '33333'])

        pmids = [p['pmid'] for p in papers]
        self.assertIn('22222', pmids)
        self.assertNotIn('33333', pmids)

    def test_abstract_is_truncated_and_ellipsis_appended_when_over_limit(self):
        long_abstract = 'word ' * 100  # well over ABSTRACT_EXCERPT_CHARS
        xml_bytes = _build_pubmed_xml([
            {'pmid': '44444', 'title': 'T', 'abstract': long_abstract},
        ])
        mock_resp = _make_mock_response(content=xml_bytes)

        with patch('predictor.pubmed_client.requests.get', return_value=mock_resp):
            papers = _efetch(['44444'])

        excerpt = papers[0]['abstractExcerpt']
        self.assertLessEqual(len(excerpt), ABSTRACT_EXCERPT_CHARS + 5)  # room for '…'
        self.assertTrue(excerpt.endswith('…'))

    def test_short_abstract_is_returned_without_ellipsis(self):
        short_abstract = 'A short abstract.'
        xml_bytes = _build_pubmed_xml([
            {'pmid': '55555', 'title': 'T', 'abstract': short_abstract},
        ])
        mock_resp = _make_mock_response(content=xml_bytes)

        with patch('predictor.pubmed_client.requests.get', return_value=mock_resp):
            papers = _efetch(['55555'])

        self.assertEqual(papers[0]['abstractExcerpt'], short_abstract)

    def test_missing_abstract_yields_none_for_abstract_excerpt(self):
        # Build XML without an AbstractText element
        root = ElementTree.Element('PubmedArticleSet')
        pa = ElementTree.SubElement(root, 'PubmedArticle')
        mc = ElementTree.SubElement(pa, 'MedlineCitation')
        ElementTree.SubElement(mc, 'PMID').text = '66666'
        art = ElementTree.SubElement(mc, 'Article')
        ElementTree.SubElement(art, 'ArticleTitle').text = 'No Abstract Article'
        xml_bytes = ElementTree.tostring(root)
        mock_resp = _make_mock_response(content=xml_bytes)

        with patch('predictor.pubmed_client.requests.get', return_value=mock_resp):
            papers = _efetch(['66666'])

        self.assertIsNone(papers[0]['abstractExcerpt'])

    def test_joins_multiple_pmids_with_comma_in_request(self):
        root = ElementTree.Element('PubmedArticleSet')
        xml_bytes = ElementTree.tostring(root)
        mock_resp = _make_mock_response(content=xml_bytes)

        with patch('predictor.pubmed_client.requests.get', return_value=mock_resp) as mock_get:
            _efetch(['11111', '22222', '33333'])

        params = mock_get.call_args[1]['params']
        self.assertEqual(params['id'], '11111,22222,33333')

    def test_uses_medline_date_when_year_element_is_absent(self):
        root = ElementTree.Element('PubmedArticleSet')
        pa = ElementTree.SubElement(root, 'PubmedArticle')
        mc = ElementTree.SubElement(pa, 'MedlineCitation')
        ElementTree.SubElement(mc, 'PMID').text = '77777'
        art = ElementTree.SubElement(mc, 'Article')
        ElementTree.SubElement(art, 'ArticleTitle').text = 'MedlineDate article'
        # Add PubDate with MedlineDate only (no Year)
        journal = ElementTree.SubElement(art, 'Journal')
        issue = ElementTree.SubElement(journal, 'JournalIssue')
        pubdate = ElementTree.SubElement(issue, 'PubDate')
        ElementTree.SubElement(pubdate, 'MedlineDate').text = '2023 Jan-Feb'
        xml_bytes = ElementTree.tostring(root)
        mock_resp = _make_mock_response(content=xml_bytes)

        with patch('predictor.pubmed_client.requests.get', return_value=mock_resp):
            papers = _efetch(['77777'])

        self.assertEqual(papers[0]['publicationDate'], '2023 Jan-Feb')

    def test_missing_year_and_medline_date_yields_date_unavailable(self):
        root = ElementTree.Element('PubmedArticleSet')
        pa = ElementTree.SubElement(root, 'PubmedArticle')
        mc = ElementTree.SubElement(pa, 'MedlineCitation')
        ElementTree.SubElement(mc, 'PMID').text = '88888'
        art = ElementTree.SubElement(mc, 'Article')
        ElementTree.SubElement(art, 'ArticleTitle').text = 'No date'
        xml_bytes = ElementTree.tostring(root)
        mock_resp = _make_mock_response(content=xml_bytes)

        with patch('predictor.pubmed_client.requests.get', return_value=mock_resp):
            papers = _efetch(['88888'])

        self.assertEqual(papers[0]['publicationDate'], 'Date unavailable')


# ---------------------------------------------------------------------------
# get_research_papers -- caching logic
# ---------------------------------------------------------------------------

class GetResearchPapersCachingTests(TestCase):
    """
    Exercises the in-process dict cache keyed by (antibiotic, organism).
    Each test manipulates _cache directly and/or mocks time.time() to
    control TTL expiry without sleeping.
    """

    def setUp(self):
        # Clear the module-level cache before every test.
        pc._cache.clear()

    def _fake_papers(self, n=1):
        return [{'pmid': str(i), 'title': f'Paper {i}'} for i in range(n)]

    def test_cache_hit_within_ttl_returns_stored_results_without_calling_esearch(self):
        papers = self._fake_papers(2)
        cache_key = ('CIP', 'all')
        pc._cache[cache_key] = (time.time(), papers)  # freshly cached

        with patch('predictor.pubmed_client._esearch') as mock_esearch:
            result = get_research_papers('CIP', organism=None)

        mock_esearch.assert_not_called()
        self.assertEqual(result, papers)

    def test_cache_miss_after_ttl_expiry_calls_esearch_and_efetch(self):
        cache_key = ('CIP', 'all')
        stale_ts = time.time() - CACHE_TTL_SECONDS - 1  # expired
        pc._cache[cache_key] = (stale_ts, self._fake_papers(1))

        fresh_papers = self._fake_papers(3)
        with patch('predictor.pubmed_client._esearch', return_value=['1', '2', '3']), \
             patch('predictor.pubmed_client._efetch', return_value=fresh_papers):
            result = get_research_papers('CIP', organism=None)

        self.assertEqual(result, fresh_papers)

    def test_fresh_results_are_written_back_to_cache(self):
        fresh_papers = self._fake_papers(2)
        with patch('predictor.pubmed_client._esearch', return_value=['1', '2']), \
             patch('predictor.pubmed_client._efetch', return_value=fresh_papers):
            get_research_papers('CIP', organism=None)

        cache_key = ('CIP', 'all')
        self.assertIn(cache_key, pc._cache)
        ts, cached_papers = pc._cache[cache_key]
        self.assertEqual(cached_papers, fresh_papers)

    def test_different_organisms_create_separate_cache_entries(self):
        papers_all = self._fake_papers(1)
        papers_ecoli = self._fake_papers(2)
        key_all = ('CIP', 'all')
        key_ecoli = ('CIP', 'Escherichia coli')
        pc._cache[key_all] = (time.time(), papers_all)
        pc._cache[key_ecoli] = (time.time(), papers_ecoli)

        result_all = get_research_papers('CIP', organism=None)
        result_ecoli = get_research_papers('CIP', organism='Escherichia coli')

        self.assertEqual(result_all, papers_all)
        self.assertEqual(result_ecoli, papers_ecoli)

    def test_case_insensitive_organism_normalizes_cache_key(self):
        """'escherichia coli' and 'Escherichia coli' must map to the same cache key."""
        fresh_papers = self._fake_papers(1)
        with patch('predictor.pubmed_client._esearch', return_value=['1']), \
             patch('predictor.pubmed_client._efetch', return_value=fresh_papers):
            get_research_papers('CIP', organism='escherichia coli')

        # The cache entry should use the canonical casing
        self.assertIn(('CIP', 'Escherichia coli'), pc._cache)
        self.assertNotIn(('CIP', 'escherichia coli'), pc._cache)

    def test_antibiotic_not_in_generic_name_map_returns_empty_list_without_caching(self):
        """If _build_query returns None, we return [] and don't touch the cache."""
        result = get_research_papers('UNKNOWN_DRUG', organism=None)
        self.assertEqual(result, [])
        self.assertEqual(len(pc._cache), 0)

    def test_network_exception_during_esearch_returns_empty_list_and_does_not_cache(self):
        import requests
        with patch('predictor.pubmed_client._esearch', side_effect=requests.RequestException("timeout")):
            result = get_research_papers('CIP', organism=None)

        self.assertEqual(result, [])
        self.assertNotIn(('CIP', 'all'), pc._cache)
