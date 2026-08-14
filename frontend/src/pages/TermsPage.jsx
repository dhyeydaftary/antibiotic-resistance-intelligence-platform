// Route: /terms — public. Rendered through the shared LegalDocument
// layout also used by PrivacyPage; see that file's header for the
// "accurate to the real app, not generic template text" note.
import { Link } from 'react-router-dom';
import usePageTitle from '../hooks/usePageTitle';
import LegalDocument from '../components/legal/LegalDocument';

const DEFINITIONS = [
    { term: 'Platform', meaning: 'AMR-Insight, its website, and every feature it provides.' },
    { term: 'You / User', meaning: 'Anyone who accesses or creates an account on the Platform.' },
    { term: 'Account', meaning: 'The registered profile created via signup, secured by email verification and a password.' },
    { term: 'Prediction', meaning: 'Any resistance estimate the Platform generates from data you submit.' },
    { term: 'Content', meaning: 'Any data, text, or files you submit to the Platform, including prediction inputs and uploaded lab reports.' },
];

const SECTIONS = [
    {
        id: 'nature', number: '1', heading: 'Nature of the Platform',
        clauses: [
            'The Platform is a research and education tool for exploring antibiotic resistance Predictions. It is not a medical device, not a diagnostic tool, and not a substitute for laboratory testing or clinical judgment.',
            'Predictions are generated from a static, public dataset and machine learning models. They are estimates, not facts about any real patient.',
        ],
    },
    {
        id: 'clinical-use', number: '2', heading: 'No Clinical Use',
        clauses: [
            'You must not use the Platform, or any Prediction it generates, as the basis for an actual clinical or treatment decision.',
            'The Platform is intended for students, researchers, and anyone learning about antimicrobial resistance and explainable AI. If You are a clinician, the Platform does not replace Your institution\'s standard testing and prescribing protocols.',
        ],
    },
    {
        id: 'accounts', number: '3', heading: 'Accounts',
        clauses: [
            'Creating an Account requires a valid email address, verified via a Firebase-issued verification link, and a password meeting the Platform\'s stated strength requirements.',
            'You are responsible for keeping Your Account credentials confidential, and for any activity that occurs under Your Account.',
            'Every active session on Your Account can be ended at once ("logging out everywhere"). This capability exists today, though it is not yet available as a self-service control in the interface — contact us using the details in the footer if You need it invoked.',
            'We may suspend or remove an Account used to abuse the Platform, including automated scraping or attempts to bypass rate limits or authentication.',
        ],
    },
    {
        id: 'content', number: '4', heading: 'Your Content',
        clauses: [
            'Content You submit is stored as Your Prediction history, associated with Your Account, and is not visible to other Users.',
            <>
                See our{' '}
                <Link to="/privacy" className="text-accent-blue transition-colors hover:text-accent-blue-hover">
                    Privacy Policy
                </Link>{' '}
                for what Content is collected, why, and how long it is retained.
            </>,
        ],
    },
    {
        id: 'accuracy', number: '5', heading: 'Accuracy and Limitations',
        clauses: [
            'Predictions are only as reliable as the data the underlying models were trained on — a Gram-negative-only organism panel, drawn from a specific time range, with limitations documented on the Platform.',
            'We do not warrant that any Prediction is accurate, complete, or fit for any particular purpose.',
            'Aggregate accuracy figures, where published, are kept separate from any specific Prediction, since they change as models are retrained.',
        ],
    },
    {
        id: 'acceptable-use', number: '6', heading: 'Acceptable Use',
        clauses: [
            'You must not attempt to bypass rate limits, authentication, or any other security control on the Platform.',
            'You must not use automated tools to scrape or bulk-extract data beyond normal use.',
            'You must not use the Platform to generate or distribute content intended to mislead others about real resistance patterns or real patients.',
        ],
    },
    {
        id: 'availability', number: '7', heading: 'Availability',
        clauses: [
            'The Platform is an academic project, not a production service with uptime guarantees.',
            'Features, models, and the Platform itself may change or become unavailable without notice.',
        ],
    },
    {
        id: 'changes', number: '8', heading: 'Changes to These Terms',
        clauses: [
            'These Terms may be updated as the Platform evolves. Continued use of the Platform after a change constitutes acceptance of the updated Terms.',
        ],
    },
];

export default function TermsPage() {
    usePageTitle('Terms & Conditions');

    return (
        <LegalDocument
            kicker="Legal"
            title="Terms & Conditions"
            effectiveDate="August 2026"
            intro="This is a plain-language document written for an academic project, not one reviewed by a lawyer. Before any real-world release, it should be reviewed by one."
            definitions={DEFINITIONS}
            sections={SECTIONS}
            disclaimer="This document does not constitute legal advice."
        />
    );
}