import usePageTitle from '../hooks/usePageTitle';
import LegalDocument from '../components/legal/LegalDocument';

const DEFINITIONS = [
    { term: 'Platform', meaning: 'AMR-Insight, its website, and every feature it provides.' },
    { term: 'You / User', meaning: 'Anyone who accesses or creates an account on the Platform.' },
    { term: 'Account Data', meaning: 'Your name, email address, and a bcrypt-hashed password — never Your actual password.' },
    { term: 'Prediction Data', meaning: 'The clinical/patient fields You submit for a Prediction, and the results returned.' },
    { term: 'Security Events', meaning: 'A timestamped, append-only log of login, logout, lockout, and password-reset events tied to Your Account.' },
];

const SECTIONS = [
    {
        id: 'collect', number: '1', heading: 'What We Collect',
        clauses: [
            'Account Data, as defined above.',
            'Prediction Data — whatever patient/clinical fields You submit for a Prediction, plus the results returned, saved as Your Prediction history.',
            'Security Events, kept to detect abuse and satisfy audit-log requirements.',
        ],
    },
    {
        id: 'not-collect', number: '2', heading: 'What We Do Not Collect',
        clauses: [
            'We do not collect real patient records. Prediction inputs are whatever You choose to type in or upload — the Platform has no connection to any hospital system, EHR, or real patient database.',
            'We do not sell Your data.',
            'We do not use Your data to train models without separately telling You.',
        ],
    },
    {
        id: 'why', number: '3', heading: 'Why We Collect It',
        clauses: [
            'Account Data exists to authenticate You and secure Your session.',
            'Prediction Data exists so You can revisit past Predictions.',
            'Security Events exist to detect and investigate account abuse — brute-force login attempts, for example — and to meet a documented log-retention floor under India\'s DPDP Rules.',
        ],
    },
    {
        id: 'access', number: '4', heading: 'Who Can See Your Data',
        clauses: [
            'Your Prediction history is visible only to You — every request is scoped to Your own Account, enforced server-side, not just hidden in the interface.',
            'Security Events are not exposed through any user-facing page; there is currently no admin panel with access to them.',
        ],
    },
    {
        id: 'retention', number: '5', heading: 'How Long We Keep It',
        clauses: [
            'Account Data and Prediction Data are kept until You ask us to delete them.',
            'Security Events are retained indefinitely, by design — satisfying a one-year-minimum retention requirement under India\'s DPDP Rules, rather than being deleted on a schedule.',
        ],
    },
    {
        id: 'third-parties', number: '6', heading: 'Third Parties Involved',
        clauses: [
            'Google Gemini is used to generate plain-language Prediction summaries and to extract fields from uploaded PDF lab reports — it receives only the data needed for that specific task, never Your Account credentials.',
            'PubMed (a public NCBI service) is queried live for research context based on the antibiotic/organism You select.',
            'Resend is used to deliver verification and password-reset emails.',
        ],
    },
    {
        id: 'security', number: '7', heading: 'Security',
        clauses: [
            'Passwords are bcrypt-hashed, sessions use JWTs with server-side revocation, and the Platform went through a documented, multi-phase security hardening process.',
            'Full technical detail is public in the Platform\'s security documentation, linked from the footer.',
        ],
    },
    {
        id: 'choices', number: '8', heading: 'Your Choices',
        clauses: [
            'You can end every active session at once via "Log out everywhere" in Your Account.',
            'To request deletion of Your Account or data, contact us using the details in the footer.',
        ],
    },
    {
        id: 'changes', number: '9', heading: 'Changes to This Policy',
        clauses: [
            'This Policy may be updated as the Platform evolves. Continued use of the Platform after a change constitutes acceptance of the updated Policy.',
        ],
    },
];

export default function PrivacyPage() {
    usePageTitle('Privacy Policy');

    return (
        <LegalDocument
            kicker="Legal"
            title="Privacy Policy"
            effectiveDate="August 2026"
            intro="This describes what the Platform actually stores, verified directly against its own data models — not generic template language. It is a plain-language document for an academic project, not one reviewed by a lawyer."
            definitions={DEFINITIONS}
            sections={SECTIONS}
            disclaimer="This document does not constitute legal advice."
        />
    );
}