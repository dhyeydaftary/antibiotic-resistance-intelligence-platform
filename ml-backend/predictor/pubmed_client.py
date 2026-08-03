import os
import sys
import time
import requests
from xml.etree import ElementTree

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)
from constants import ORGANISM_LIST

TOOL_NAME = os.environ.get('PUBMED_TOOL_NAME', 'AMR-Insight')
CONTACT_EMAIL = os.environ.get('PUBMED_CONTACT_EMAIL', '')
API_KEY = os.environ.get('PUBMED_API_KEY', '')

ESEARCH_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi'
EFETCH_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi'

MAX_RESULTS = 5
CACHE_TTL_SECONDS = 60 * 60 * 6  # 6 hours — papers don't change hourly
ABSTRACT_EXCERPT_CHARS = 240

# Bundled codes in the dataset represent two clinically-equivalent drugs —
# search both, joined with OR, so neither is silently dropped.
GENERIC_NAME_MAP = {
    'AMX/AMP': ['Amoxicillin', 'Ampicillin'],
    'AMC': ['Amoxicillin-clavulanic acid'],
    'CZ': ['Cefazolin'],
    'FOX': ['Cefoxitin'],
    'CTX/CRO': ['Cefotaxime', 'Ceftriaxone'],
    'IPM': ['Imipenem'],
    'GEN': ['Gentamicin'],
    'AN': ['Amikacin'],
    'Acide nalidixique': ['Nalidixic acid'],
    'ofx': ['Ofloxacin'],
    'CIP': ['Ciprofloxacin'],
    'C': ['Chloramphenicol'],
    'Co-trimoxazole': ['Trimethoprim-sulfamethoxazole'],
    'Furanes': ['Nitrofurantoin'],
    'colistine': ['Colistin'],
}

_cache = {}  # (antibiotic, organism) -> (timestamp, results)


def _build_query(antibiotic, organism):
    names = GENERIC_NAME_MAP.get(antibiotic)
    if not names:
        return None

    drug_clause = ' OR '.join(f'"{name}"[Title/Abstract]' for name in names)
    query = f'({drug_clause}) AND "antibiotic resistance"[Title/Abstract]'

    if organism and organism != 'all':
        # Use only the genus+species, PubMed indexing is picky about
        # trailing "spp." style dataset labels.
        clean_organism = organism.replace(' spp.', '').strip()
        query += f' AND "{clean_organism}"[Title/Abstract]'

    return query


def _base_params():
    params = {'tool': TOOL_NAME, 'email': CONTACT_EMAIL}
    if API_KEY:
        params['api_key'] = API_KEY
    return params


def _esearch(query):
    params = {
        **_base_params(),
        'db': 'pubmed',
        'term': query,
        'retmax': MAX_RESULTS,
        'sort': 'date',
        'retmode': 'json',
    }
    response = requests.get(ESEARCH_URL, params=params, timeout=8)
    response.raise_for_status()
    return response.json().get('esearchresult', {}).get('idlist', [])


def _full_text(element):
    """
    PubMed's XML often nests tags inside titles/abstracts — e.g. italicized
    species names like <i>Klebsiella pneumoniae</i>. element.text alone only
    captures text BEFORE the first nested tag, silently truncating anything
    after it. itertext() walks the full subtree so nothing gets dropped.
    """
    if element is None:
        return None
    return ''.join(element.itertext()).strip()


def _efetch(pmids):
    if not pmids:
        return []

    params = {
        **_base_params(),
        'db': 'pubmed',
        'id': ','.join(pmids),
        'retmode': 'xml',
    }
    response = requests.get(EFETCH_URL, params=params, timeout=8)
    response.raise_for_status()

    root = ElementTree.fromstring(response.content)
    papers = []

    for article in root.findall('.//PubmedArticle'):
        pmid_el = article.find('.//PMID')
        title_el = article.find('.//ArticleTitle')
        journal_el = article.find('.//Journal/Title')
        abstract_el = article.find('.//AbstractText')

        year_el = article.find('.//PubDate/Year')
        medline_date_el = article.find('.//PubDate/MedlineDate')
        pub_date = (
            year_el.text if year_el is not None
            else (medline_date_el.text if medline_date_el is not None else 'Date unavailable')
        )

        if pmid_el is None or title_el is None:
            continue

        title_text = _full_text(title_el) or 'Untitled'
        abstract_text = _full_text(abstract_el) or ''
        excerpt = abstract_text[:ABSTRACT_EXCERPT_CHARS]
        if len(abstract_text) > ABSTRACT_EXCERPT_CHARS:
            excerpt = excerpt.rsplit(' ', 1)[0] + '…'

        papers.append({
            'pmid': pmid_el.text,
            'title': title_text,
            'journal': journal_el.text if journal_el is not None else None,
            'publicationDate': pub_date,
            'abstractExcerpt': excerpt or None,
            'url': f'https://pubmed.ncbi.nlm.nih.gov/{pmid_el.text}/',
        })

    return papers


def get_research_papers(antibiotic, organism=None):
    """
    Real PubMed search results only — title, journal, date, a short verbatim
    excerpt of the actual abstract, and a direct link. Nothing here is
    AI-summarized or rewritten; if PubMed has nothing, we return an empty
    list and the frontend shows an honest empty state.
    """
    if organism and organism != 'all' and organism not in ORGANISM_LIST:
        raise ValueError(f"Unknown organism: {organism}")

    cache_key = (antibiotic, organism or 'all')
    cached = _cache.get(cache_key)
    if cached and (time.time() - cached[0]) < CACHE_TTL_SECONDS:
        return cached[1]

    query = _build_query(antibiotic, organism)
    if query is None:
        return []

    try:
        pmids = _esearch(query)
        papers = _efetch(pmids)
    except requests.RequestException:
        return []

    _cache[cache_key] = (time.time(), papers)
    return papers