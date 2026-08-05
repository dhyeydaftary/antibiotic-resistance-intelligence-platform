import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Search, X, ChevronRight } from 'lucide-react';
import usePageTitle from '../hooks/usePageTitle';

const fadeUp = {
    hidden: { opacity: 0, y: 14 },
    visible: (i = 0) => ({
        opacity: 1,
        y: 0,
        transition: { duration: 0.5, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] },
    }),
};

/* ------------------------------------------------------------------ */
/* Data -- unchanged from the verified version (81 terms, 9 categories,
   zero duplicate IDs, zero broken cross-references -- confirmed via
   esbuild + a referential-integrity check before this revision). */
/* ------------------------------------------------------------------ */

const CATEGORIES = [
    { id: 'amr', label: 'Antimicrobial Resistance' },
    { id: 'ai-ml', label: 'AI & Machine Learning' },
    { id: 'explainability', label: 'Explainability' },
    { id: 'data', label: 'Data & Analytics' },
    { id: 'evaluation', label: 'Model Evaluation' },
    { id: 'security', label: 'Security & Authentication' },
    { id: 'platform', label: 'Platform & Architecture' },
    { id: 'research', label: 'Research' },
    { id: 'amr-insight', label: 'AMR-Insight Specific' },
];

const TERMS = [
    // ---------------- Antimicrobial Resistance ----------------
    { id: 'amr', category: 'amr', term: 'AMR (Antimicrobial Resistance)', definition: "Bacteria evolving to survive antibiotics that used to work against them. AMR-Insight explores whether patient and lab data can help anticipate resistance patterns before full lab testing completes — it doesn't slow down or replace that testing.", related: ['antibiotic-resistance'] },
    { id: 'antibiotic', category: 'amr', term: 'Antibiotic', definition: 'A medicine used to treat bacterial infections. This platform predicts resistance across a panel of 15 specific antibiotics, not a general "will antibiotics work" question.', related: ['antibiotic-panel'] },
    { id: 'antibiotic-resistance', category: 'amr', term: 'Antibiotic Resistance', definition: "A bacterium's ability to survive an antibiotic that would normally stop or kill it. This is what every prediction on this platform is estimating, per antibiotic, per patient.", related: ['amr', 'resistant'] },
    { id: 'antibiotic-susceptibility', category: 'amr', term: 'Antibiotic Susceptibility', definition: "The flip side of resistance — whether an antibiotic is still predicted to work against a given organism. AST (below) is the lab process that measures this directly; this platform predicts it from patient and clinical data.", related: ['susceptible', 'ast'] },
    { id: 'resistant', category: 'amr', term: 'Resistant (R)', definition: 'One of three possible prediction outcomes for an antibiotic: the organism is predicted to survive it at normal doses.', related: ['susceptible', 'intermediate'] },
    { id: 'intermediate', category: 'amr', term: 'Intermediate (I)', definition: "A prediction outcome sitting between Resistant and Susceptible — a higher dose or different route might still work, but it's less certain either way.", related: ['resistant', 'susceptible'] },
    { id: 'susceptible', category: 'amr', term: 'Susceptible (S)', definition: 'One of three possible prediction outcomes: the antibiotic is predicted to work against the organism.', related: ['resistant', 'intermediate'] },
    { id: 'ast', category: 'amr', term: 'AST (Antibiotic Susceptibility Testing)', definition: "The real laboratory process — growing an organism in the presence of an antibiotic to directly observe whether it survives. This is the ground truth this platform's training data comes from; a prediction here is not a substitute for AST.", related: ['antibiotic-susceptibility', 'mic'] },
    { id: 'mic', category: 'amr', term: 'MIC (Minimum Inhibitory Concentration)', definition: "The lowest concentration of an antibiotic that visibly stops an organism from growing in a lab test. It's the underlying lab measurement that R/S/I classifications are usually derived from — this platform predicts the R/S/I category directly, not a raw MIC value." },
    { id: 'who-aware', category: 'amr', term: 'WHO AWaRe', definition: 'A World Health Organization classification (Access / Watch / Reserve) based on resistance risk and how carefully an antibiotic should be stewarded. Access antibiotics are first-choice, lower-concern options; Watch antibiotics carry higher resistance risk; Reserve antibiotics are held back for confirmed multi-drug-resistant infections.', related: ['antibiotic'] },
    { id: 'pathogen', category: 'amr', term: 'Pathogen', definition: 'A microorganism capable of causing disease — in this context, specifically the bacterial organisms this platform predicts resistance for.', related: ['organism'] },
    { id: 'organism', category: 'amr', term: 'Organism', definition: 'The bacterial species identified in a lab culture (e.g. Escherichia coli, Klebsiella pneumoniae). One of the most influential prediction inputs, since resistance patterns vary significantly by species.', related: ['gram-negative', 'gram-positive'] },
    { id: 'specimen', category: 'amr', term: 'Specimen', definition: 'The physical sample taken from a patient for testing — e.g. blood, urine. Its source is one of the clinical inputs a prediction is based on.' },
    { id: 'infection', category: 'amr', term: 'Infection', definition: 'The underlying clinical event this whole platform exists to help reason about — a pathogen established in a patient, with resistance prediction as one piece of the response to it.' },
    { id: 'culture', category: 'amr', term: 'Culture', definition: 'The lab process of growing a sample under controlled conditions to identify which organism is present. Organism identification from a culture is a key input to every prediction here.' },
    { id: 'gram-negative', category: 'amr', term: 'Gram-negative', definition: "A structural classification of bacteria based on their cell wall (named for the Gram stain test used to identify it). This platform's organism panel is Gram-negative only — a stated, deliberate scope limit, not an oversight.", related: ['gram-positive', 'organism'] },
    { id: 'gram-positive', category: 'amr', term: 'Gram-positive', definition: "The other structural classification of bacteria. This platform does not currently cover Gram-positive organisms — documented explicitly as a known limitation, not silently omitted.", related: ['gram-negative'] },

    // ---------------- AI & Machine Learning ----------------
    { id: 'artificial-intelligence', category: 'ai-ml', term: 'Artificial Intelligence (AI)', definition: 'Software that performs tasks normally requiring human judgment. On this platform, two distinct AI systems are involved: the prediction models (CatBoost) and the language model that writes summaries (Gemini) — they do different jobs and never substitute for each other.', related: ['machine-learning', 'catboost'] },
    { id: 'machine-learning', category: 'ai-ml', term: 'Machine Learning', definition: 'Software that improves at a task by learning from examples, rather than being explicitly programmed with fixed rules. Nobody wrote a rule saying "if hospitalized before, add 12% resistance risk" — the model inferred patterns like that from training data.', related: ['catboost', 'training-data'] },
    { id: 'explainable-ai', category: 'ai-ml', term: 'Explainable AI', definition: 'AI whose reasoning can be inspected, not just its output. Every prediction here comes with a SHAP breakdown showing exactly which inputs drove it — see the Explainability section below.', related: ['shap', 'interpretability'] },
    { id: 'catboost', category: 'ai-ml', term: 'CatBoost', definition: 'The machine learning model type behind every prediction — a gradient-boosted decision tree model, with one dedicated model trained per antibiotic, not one model guessing at all 15 at once.', related: ['model', 'gradient-boosting'] },
    { id: 'gradient-boosting', category: 'ai-ml', term: 'Gradient Boosting', definition: 'The general technique CatBoost uses — building many small decision trees in sequence, where each new one specifically corrects the previous ones\' mistakes. It\'s why 15 individually-trained models can each get sharper at one specific antibiotic, rather than one model spreading itself thin across all of them.', related: ['catboost'] },
    { id: 'shap', category: 'ai-ml', term: 'SHAP (SHAP Values)', definition: "A method for explaining one prediction by showing how much each input pushed the result toward or away from 'resistant,' expressed as a signed number per input. Computed natively by CatBoost for every prediction, not shown as a general statistic.", related: ['feature-contribution', 'explainable-ai'] },
    { id: 'feature', category: 'ai-ml', term: 'Feature', definition: 'Any single input a model uses — an organism, a lab value, a vital sign, a clinical history flag. A SHAP explanation breaks a prediction down feature by feature.', related: ['feature-engineering', 'feature-importance'] },
    { id: 'feature-engineering', category: 'ai-ml', term: 'Feature Engineering', definition: 'The process of deciding which raw data becomes which model input, and in what form. On this platform, roughly half the training features are engineered from synthetic clinical variables, with an explicit process to prevent them from leaking the answer into the training data.', related: ['synthetic-features', 'data-leakage'] },
    { id: 'feature-importance', category: 'ai-ml', term: 'Feature Importance', definition: "A general ranking of which inputs matter most to a model overall, across all its predictions. This is different from a SHAP explanation, which shows a feature's contribution to one specific prediction, not the model in general.", related: ['feature', 'shap'] },
    { id: 'prediction', category: 'ai-ml', term: 'Prediction', definition: "The model's output for one antibiotic: Resistant, Susceptible, or Intermediate, with a confidence score. A single click on this platform generates 15 predictions at once, one per antibiotic.", related: ['confidence-score'] },
    { id: 'confidence-score', category: 'ai-ml', term: 'Confidence Score', definition: "A percentage showing how strongly the model favors its predicted outcome for one antibiotic. It reflects the model's own internal certainty, not a guarantee of real-world accuracy — two antibiotics can both read Resistant, one at 96% and one at 53%." },
    { id: 'inference', category: 'ai-ml', term: 'Inference', definition: 'The moment a trained model is actually used on a new, real case — as opposed to training, which happens once, offline, ahead of time. Training happened before this app existed; inference happens every time someone clicks Predict.', related: ['model'] },
    { id: 'model', category: 'ai-ml', term: 'Model', definition: 'A program trained on past examples to make predictions on new ones. When people say "the model predicted resistant," they mean one of the 15 CatBoost models, not the app as a whole.', related: ['catboost'] },
    { id: 'hyperparameter', category: 'ai-ml', term: 'Hyperparameter', definition: 'A setting chosen before training that shapes how a model learns (e.g. how many trees it builds), as opposed to something the model learns on its own from data.' },
    { id: 'one-hot-encoding', category: 'ai-ml', term: 'One-Hot Encoding', definition: 'A way of turning a category (like an organism name) into a numeric format a model can actually use — a separate yes/no column for each possible value, rather than an arbitrary number standing in for a name.' },

    // ---------------- Explainability ----------------
    { id: 'local-explanation', category: 'explainability', term: 'Local Explanation', definition: "An explanation for one specific prediction — this platform's SHAP breakdown is a local explanation: it explains this patient's result, not the model's behavior in general.", related: ['global-explanation', 'shap'] },
    { id: 'global-explanation', category: 'explainability', term: 'Global Explanation', definition: "An explanation of a model's overall behavior across many predictions, rather than one specific case. This platform emphasizes local explanations, since a clinical decision is always about one specific patient.", related: ['local-explanation'] },
    { id: 'feature-contribution', category: 'explainability', term: 'Feature Contribution', definition: 'The signed number next to each feature in a SHAP explanation — positive pushes toward Resistant, negative pushes toward Susceptible. A contribution of −0.17 on a lab value means it was actually pulling the prediction away from Resistant.', related: ['shap'] },
    { id: 'interpretability', category: 'explainability', term: 'Interpretability', definition: 'How easily a human can understand why a model produced a given output. This platform prioritizes it directly — SHAP explanations exist specifically so a prediction is never just a bare number with no reasoning attached.', related: ['explainable-ai'] },

    // ---------------- Data & Analytics ----------------
    { id: 'dataset', category: 'data', term: 'Dataset', definition: 'The historical data every model was trained on — 10,710 rows, 23 source columns, spanning 2020–2025, sourced from a public Kaggle dataset. A model can only know what its dataset contains.', related: ['training-data'] },
    { id: 'training-data', category: 'data', term: 'Training Data', definition: "The subset of a dataset actually used to teach a model, before it's ever run on a new, real case. These models were trained on the platform's 10,710-row dataset — nothing outside that data shapes their predictions.", related: ['dataset'] },
    { id: 'data-cleaning', category: 'data', term: 'Data Cleaning', definition: "The process of fixing or removing problems in raw data (errors, inconsistent formatting, duplicates) before it's usable for training." },
    { id: 'missing-values', category: 'data', term: 'Missing Values', definition: "Gaps in the dataset where a field simply wasn't recorded for a given row. How these are handled (filled in, or left absent) is a real decision that can affect what a model learns." },
    { id: 'synthetic-features', category: 'data', term: 'Synthetic Features', definition: 'Clinical variables generated to augment the real dataset rather than measured directly — clearly labeled as such, not presented as if they were real recorded patient data.', related: ['feature-engineering', 'data-leakage'] },
    { id: 'data-leakage', category: 'data', term: 'Data Leakage', definition: "When information that wouldn't actually be available at prediction time accidentally makes it into training, making a model look more accurate than it really is. This platform has an explicit, documented process to check synthetic features for exactly this before they're used.", related: ['synthetic-features'] },
    { id: 'trend-analysis', category: 'data', term: 'Trend Analysis', definition: "Looking at resistance rates over time rather than one prediction in isolation — the Trends page's core purpose, comparing a chosen antibiotic and organism across the full date range in the dataset.", related: ['current-rate'] },

    // ---------------- Model Evaluation ----------------
    { id: 'accuracy', category: 'evaluation', term: 'Accuracy', definition: 'The percentage of predictions a model gets right overall. On its own it can be misleading if one outcome (e.g. Susceptible) is much more common than the others in the data — which is why this platform also tracks precision, recall, and F1.', related: ['precision', 'recall', 'f1-score'] },
    { id: 'precision', category: 'evaluation', term: 'Precision', definition: 'Of everything a model labeled "Resistant," what fraction actually was resistant. High precision means fewer false alarms.', related: ['recall'] },
    { id: 'recall', category: 'evaluation', term: 'Recall', definition: 'Of everything that was actually resistant, what fraction the model correctly caught. High recall means fewer missed cases — often the more clinically important number to watch.', related: ['precision'] },
    { id: 'f1-score', category: 'evaluation', term: 'F1 Score', definition: 'A single number balancing precision and recall together, useful when you care about both false alarms and missed cases rather than optimizing for just one.', related: ['precision', 'recall'] },
    { id: 'confusion-matrix', category: 'evaluation', term: 'Confusion Matrix', definition: "A table showing exactly how a model's predictions compare to real outcomes — correct calls, and every specific type of mistake, broken out separately rather than collapsed into one accuracy number." },
    { id: 'cross-validation', category: 'evaluation', term: 'Cross Validation', definition: "A technique for testing a model's performance on data it wasn't trained on, by repeatedly splitting the dataset into different training and testing portions — a check against a model that just memorized its training data instead of learning real patterns." },

    // ---------------- Security & Authentication ----------------
    { id: 'authentication', category: 'security', term: 'Authentication', definition: "Confirming who you are — this platform's login/signup flow, backed by email OTP verification and a JWT-based session.", related: ['jwt', 'otp'] },
    { id: 'authorization', category: 'security', term: 'Authorization', definition: "Confirming what you're allowed to do, once you're already known to be who you say you are — e.g. only ever seeing your own prediction history, never anyone else's.", related: ['authentication'] },
    { id: 'jwt', category: 'security', term: 'JWT (JSON Web Token)', definition: "The token issued when you log in, sent with every subsequent request to prove you're authenticated — without it, or with an invalid one, protected pages and actions are inaccessible.", related: ['authentication'] },
    { id: 'otp', category: 'security', term: 'OTP (One-Time Password)', definition: 'A short, single-use code emailed to you to verify your address during signup or password reset — required before an account becomes usable.', related: ['authentication'] },
    { id: 'bcrypt', category: 'security', term: 'bcrypt', definition: 'The algorithm used to hash passwords before storing them — meaning your actual password is never stored anywhere, only a one-way transformation of it that can verify a login attempt without ever being reversible back into the original password.', related: ['password-hashing'] },
    { id: 'password-hashing', category: 'security', term: 'Password Hashing', definition: 'Converting a password into a fixed, irreversible value before storage, so that even if the underlying data were ever exposed, the real passwords themselves would not be.', related: ['bcrypt'] },
    { id: 'rate-limiting', category: 'security', term: 'Rate Limiting', definition: 'A cap on how many requests one account can make to a given feature in a given time window — protection against automated abuse, tuned differently per feature based on real cost and risk.' },
    { id: 'api-key', category: 'security', term: 'API Key', definition: "A shared secret used between this platform's own internal services to confirm a request genuinely came from another trusted part of the system, not an outside party." },
    { id: 'security-headers', category: 'security', term: 'Security Headers', definition: "Instructions sent with every page telling your browser how to handle it safely — e.g. blocking the page from being embedded elsewhere, or restricting which external resources it's allowed to load." },

    // ---------------- Platform & Architecture ----------------
    { id: 'frontend', category: 'platform', term: 'Frontend', definition: "The part of the app you're looking at right now — everything rendered in your browser. It never talks to the prediction engine directly; every request goes through the gateway first.", related: ['gateway', 'backend'] },
    { id: 'gateway', category: 'platform', term: 'Gateway', definition: 'The service that sits between the frontend and the prediction engine, handling login, prediction history, and every security check before a request is allowed through.', related: ['frontend', 'backend', 'rest-api'] },
    { id: 'backend', category: 'platform', term: 'Backend', definition: "The server-side part of the app that does the actual work — in this platform's case, split into two services (the Gateway, and the ML backend that runs predictions) rather than one single backend.", related: ['gateway'] },
    { id: 'rest-api', category: 'platform', term: 'REST API', definition: "The convention this platform's services use to talk to each other and to the frontend — structured requests and responses over standard web protocols.", related: ['endpoint', 'request', 'response'] },
    { id: 'endpoint', category: 'platform', term: 'Endpoint', definition: 'One specific address a request can be sent to — e.g. the endpoint that runs a prediction is different from the one that fetches your history.' },
    { id: 'request', category: 'platform', term: 'Request', definition: 'What your browser sends when you take an action — e.g. clicking Predict sends a request carrying your patient/clinical inputs.', related: ['response', 'endpoint'] },
    { id: 'response', category: 'platform', term: 'Response', definition: 'What comes back after a request — e.g. the 15 predictions, their confidence scores, and SHAP explanations, all in one response.', related: ['request'] },
    { id: 'mongodb', category: 'platform', term: 'MongoDB', definition: 'The database that stores accounts and prediction history. Only the Gateway service ever connects to it directly.' },
    { id: 'django', category: 'platform', term: 'Django', definition: 'The framework the ML backend is built on — the service that actually loads the 15 CatBoost models and runs predictions.' },
    { id: 'react', category: 'platform', term: 'React', definition: 'The framework this entire frontend — every page you can see and click through — is built with.' },

    // ---------------- Research ----------------
    { id: 'pubmed', category: 'research', term: 'PubMed', definition: "A real, live database of peer-reviewed medical literature. This platform's Research page queries it directly via NCBI's public API, surfacing real papers relevant to your antibiotic and organism selection — not a static or fabricated list.", related: ['literature-review'] },
    { id: 'literature-review', category: 'research', term: 'Literature Review', definition: "Surveying existing published research on a topic. The Research page is a lightweight, automated version of this — pulling relevant PubMed results for the specific antibiotic/organism combination you're looking at.", related: ['pubmed'] },
    { id: 'clinical-decision-support', category: 'research', term: 'Clinical Decision Support', definition: 'A category of tool meant to inform a clinical decision, not make it. This platform is explicitly a research and education tool — not a certified clinical decision support system, and not a substitute for one.' },
    { id: 'evidence-based-medicine', category: 'research', term: 'Evidence-Based Medicine', definition: 'Making clinical decisions based on the best available research evidence, not habit or intuition alone. This platform\'s own tagline, "Evidence before confidence," reflects the same underlying idea.' },

    // ---------------- AMR-Insight Specific ----------------
    { id: 'amr-insight', category: 'amr-insight', term: 'AMR-Insight', definition: 'The name of this platform — a research and education tool for exploring antibiotic resistance predictions, not a clinical or diagnostic product.' },
    { id: 'ai-insights', category: 'amr-insight', term: 'AI Insights', definition: 'A short, plain-language summary generated after the model has already produced its 15 predictions — it describes the result, it does not decide it, and it never sees the SHAP explanations.', related: ['prediction'] },
    { id: 'prediction-history', category: 'amr-insight', term: 'Prediction History', definition: 'The record of every past prediction tied to your account, filterable by result, antibiotic, organism, and date — visible only to you.' },
    { id: 'antibiotic-panel', category: 'amr-insight', term: 'Antibiotic Panel', definition: 'The full set of 15 antibiotics every prediction is scored against in a single request — never a subset, and never one antibiotic at a time.', related: ['antibiotic'] },
    { id: 'current-rate', category: 'amr-insight', term: 'Current Rate / Peak Rate', definition: 'On the Trends page: the resistance rate for the most recent period, versus the highest rate seen anywhere in the selected date range, for your chosen antibiotic and organism.', related: ['trend-analysis'] },
    { id: 'research-hub', category: 'amr-insight', term: 'Research Hub', definition: "The Explore page's tab surfacing real PubMed literature relevant to a selected organism or antibiotic.", related: ['pubmed'] },
    { id: 'model-version', category: 'amr-insight', term: 'Model Version', definition: "Which iteration of the trained models is currently running (e.g. v3). Kept explicit rather than hidden, since a prediction's underlying model can meaningfully change between versions." },
    { id: 'transparency', category: 'amr-insight', term: 'Transparency', definition: 'This platform\'s stated commitment to publishing exactly what it runs on, its limits, and what it explicitly is not — a real page on this site, not just a claim.' },
    { id: 'evidence-before-confidence', category: 'amr-insight', term: '"Evidence Before Confidence"', definition: "This platform's tagline — a prediction's confidence score is only meaningful alongside the evidence (SHAP explanation, data sources, known limitations) behind it, never on its own." },
];

/* ------------------------------------------------------------------ */

function slugSearchable(t) {
    return `${t.term} ${t.definition}`.toLowerCase();
}

// Critically damped by default (§4) -- graceful, no distracting overshoot.
// Reserved for hover/tap, which are pointer-driven, so a spring (not a CSS
// ease) is correct per §4's "reach for springs for anything a user can touch."
const cardSpring = { type: 'spring', bounce: 0, duration: 0.35 };

function TermCard({ item, onJumpTo, reduceMotion }) {
    return (
        <motion.div
            id={item.id}
            data-testid={`glossary-term-${item.id}`}
            whileHover={reduceMotion ? undefined : { y: -3 }}
            whileTap={reduceMotion ? undefined : { y: 0, scale: 0.995 }}
            transition={cardSpring}
            className="scroll-mt-28 rounded-[18px] border border-canvas-hairline bg-white p-6 shadow-[0_1px_0_rgba(255,255,255,0.6)_inset,0_1px_2px_rgba(20,20,25,0.04),0_8px_20px_-12px_rgba(20,20,25,0.10)] transition-[border-color,box-shadow] duration-300 hover:border-accent-blue/30 hover:shadow-[0_1px_0_rgba(255,255,255,0.6)_inset,0_1px_2px_rgba(20,20,25,0.04),0_16px_32px_-16px_rgba(20,20,25,0.16)]"
        >
            <h3 className="font-display text-[17px] font-semibold leading-snug tracking-[-0.01em] text-page-ink">
                {item.term}
            </h3>
            <p className="mt-2.5 font-sans text-[14px] leading-[1.65] text-page-muted">
                {item.definition}
            </p>
            {item.related?.length > 0 && (
                <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1.5 border-t border-canvas-hairline pt-3.5">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-page-faint">See also</span>
                    {item.related.map((relId) => {
                        const rel = TERMS.find((t) => t.id === relId);
                        if (!rel) return null;
                        return (
                            <button
                                key={relId}
                                type="button"
                                onClick={() => onJumpTo(relId)}
                                className="rounded-full bg-canvas-alt px-2.5 py-1 font-mono text-[11px] text-accent-blue transition-colors hover:bg-accent-blue/10"
                            >
                                {rel.term.replace(/\s*\(.*?\)/, '')}
                            </button>
                        );
                    })}
                </div>
            )}
        </motion.div>
    );
}

const HEADER_OFFSET = 96; // px reserved for the sticky top bar when scrolling to a section

export default function GlossaryPage() {
    usePageTitle('Glossary');
    
    const [query, setQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState(CATEGORIES[0].id);
    const sectionRefs = useRef({});
    const reduceMotion = useReducedMotion();

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return TERMS;
        return TERMS.filter((t) => slugSearchable(t).includes(q));
    }, [query]);

    const groupedCategories = useMemo(() => {
        return CATEGORIES
            .map((cat) => ({ ...cat, terms: filtered.filter((t) => t.category === cat.id) }))
            .filter((cat) => cat.terms.length > 0);
    }, [filtered]);

    // Track which category section is currently in view, so the sidebar can
    // answer "where am I" (§16 Wayfinding) without the user scrolling back up
    // to check. Only re-runs when the visible category list actually changes
    // (e.g. after a search), not on every render.
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                const visible = entries.filter((e) => e.isIntersecting);
                if (visible.length === 0) return;
                const topmost = visible.reduce((a, b) =>
                    a.boundingClientRect.top < b.boundingClientRect.top ? a : b
                );
                setActiveCategory(topmost.target.id.replace('cat-', ''));
            },
            { rootMargin: `-${HEADER_OFFSET + 8}px 0px -65% 0px`, threshold: 0 }
        );
        Object.values(sectionRefs.current).forEach((el) => el && observer.observe(el));
        return () => observer.disconnect();
    }, [groupedCategories]);

    const scrollToCategory = useCallback((catId) => {
        const el = document.getElementById(`cat-${catId}`);
        if (!el) return;
        const top = el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;
        window.scrollTo({ top, behavior: reduceMotion ? 'auto' : 'smooth' });
    }, [reduceMotion]);

    const handleNavClick = (e, catId) => {
        e.preventDefault();
        scrollToCategory(catId);
    };

    const handleJumpTo = (id) => {
        setQuery('');
        requestAnimationFrame(() => {
            document.getElementById(id)?.scrollIntoView({
                behavior: reduceMotion ? 'auto' : 'smooth',
                block: 'center',
            });
        });
    };

    return (
        <div className="bg-canvas">
            {/* Header */}
            <section
                id="glossary-opening"
                data-testid="glossary-opening-section"
                className="px-6 pt-8 pb-8 sm:pt-12 sm:pb-10"
            >
                <div className="mx-auto max-w-6xl">
                    <motion.div
                        initial="hidden"
                        animate="visible"
                        custom={0}
                        variants={fadeUp}
                        className="mb-4 flex items-center gap-3"
                    >
                        <span className="h-px w-6 bg-canvas-hairline" />
                        <span className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-page-faint">
                            Reference
                        </span>
                    </motion.div>

                    <motion.h1
                        initial="hidden"
                        animate="visible"
                        custom={1}
                        variants={fadeUp}
                        className="font-display text-[36px] font-semibold leading-[1.1] tracking-[-0.02em] text-page-ink sm:text-[44px]"
                    >
                        Glossary
                    </motion.h1>

                    <motion.p
                        initial="hidden"
                        animate="visible"
                        custom={2}
                        variants={fadeUp}
                        className="mt-4 max-w-2xl font-sans text-[15px] leading-[1.6] text-page-muted"
                    >
                        Every term used across the app and its documentation, grouped by category. Search below, or browse by topic.
                    </motion.p>

                    {/* Apple-style search: dark material with a top highlight edge
              (the "light catching the material" cue from §12), not flat
              black -- a real surface, not a solid rectangle. */}
                    <motion.div
                        initial="hidden"
                        animate="visible"
                        custom={3}
                        variants={fadeUp}
                        className="relative mt-6 max-w-md"
                    >
                        <label htmlFor="glossary-search" className="sr-only">Search the glossary</label>
                        <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/40" aria-hidden="true" />
                        <input
                            id="glossary-search"
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search terms — e.g. SHAP, JWT, WHO AWaRe…"
                            className="w-full rounded-full border border-white/[0.08] bg-[#1d1d1f] py-3 pl-11 pr-10 font-sans text-[14px] text-white placeholder:text-white/35 shadow-[0_1px_0_rgba(255,255,255,0.08)_inset,0_10px_28px_-12px_rgba(0,0,0,0.5)] transition-shadow duration-300 focus:border-white/[0.14] focus:shadow-[0_1px_0_rgba(255,255,255,0.1)_inset,0_0_0_3px_rgba(10,132,255,0.35),0_10px_28px_-12px_rgba(0,0,0,0.5)] focus:outline-none"
                        />
                        {query && (
                            <button
                                type="button"
                                onClick={() => setQuery('')}
                                aria-label="Clear search"
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 transition-colors hover:text-white"
                            >
                                <X size={15} />
                            </button>
                        )}
                    </motion.div>

                    <motion.p
                        initial="hidden"
                        animate="visible"
                        custom={4}
                        variants={fadeUp}
                        aria-live="polite"
                        className="mt-3 font-mono text-[11px] uppercase tracking-wider text-page-faint"
                    >
                        {filtered.length} of {TERMS.length} terms
                        {query && ` matching "${query}"`}
                    </motion.p>
                </div>
            </section>

            <div className="mx-auto max-w-6xl border-b border-canvas-hairline" />

            {/* Body: sticky category nav (desktop) + content */}
            <div className="mx-auto max-w-6xl px-6 py-10 sm:py-12">
                <div className="lg:grid lg:grid-cols-[240px_1fr] lg:gap-12">
                    <nav
                        aria-label="Glossary categories"
                        className="hidden lg:sticky lg:top-24 lg:block lg:self-start"
                    >
                        <ul className="relative space-y-0.5 border-l border-canvas-hairline pl-4">
                            {groupedCategories.map((cat) => {
                                const isActive = cat.id === activeCategory;
                                return (
                                    <li key={cat.id} className="relative">
                                        {isActive && (
                                            <motion.span
                                                layoutId="glossary-active-indicator"
                                                transition={reduceMotion ? { duration: 0 } : { type: 'spring', bounce: 0, duration: 0.35 }}
                                                className="absolute -left-4 top-0 h-full w-[2px] bg-accent-blue"
                                            />
                                        )}
                                        <a
                                            href={`#cat-${cat.id}`}
                                            onClick={(e) => handleNavClick(e, cat.id)}
                                            aria-current={isActive ? 'true' : undefined}
                                            className={`flex items-center justify-between gap-2 rounded-lg py-2 pl-2 pr-2 font-sans text-[14.5px] transition-colors ${isActive
                                                    ? 'font-semibold text-page-ink'
                                                    : 'text-page-muted hover:text-page-ink'
                                                }`}
                                        >
                                            <span className="flex items-center gap-1.5">
                                                {isActive && (
                                                    <ChevronRight size={13} className="shrink-0 text-accent-blue" aria-hidden="true" />
                                                )}
                                                {cat.label}
                                            </span>
                                            <span className="font-mono text-[11px] text-page-faint">{cat.terms.length}</span>
                                        </a>
                                    </li>
                                );
                            })}
                        </ul>
                    </nav>

                    <div className="min-w-0 space-y-12">
                        {groupedCategories.length === 0 && (
                            <p className="font-sans text-[14px] text-page-muted">
                                No terms match &quot;{query}&quot;. Try a shorter search, or clear it to browse by category.
                            </p>
                        )}

                        {groupedCategories.map((cat) => (
                            <section
                                key={cat.id}
                                id={`cat-${cat.id}`}
                                ref={(el) => { sectionRefs.current[cat.id] = el; }}
                                className="scroll-mt-24"
                                aria-labelledby={`cat-${cat.id}-heading`}
                            >
                                <h2
                                    id={`cat-${cat.id}-heading`}
                                    className="font-display text-[22px] font-semibold tracking-[-0.01em] text-page-ink"
                                >
                                    {cat.label}
                                </h2>
                                <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    {cat.terms.map((item) => (
                                        <TermCard key={item.id} item={item} onJumpTo={handleJumpTo} reduceMotion={reduceMotion} />
                                    ))}
                                </div>
                            </section>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}