// UNUSED — grep confirms no file imports AboutReferences. A leftover
// alias re-rendering AboutBackMatter verbatim; AboutPage.jsx renders
// AboutBackMatter directly instead.
import AboutBackMatter from './AboutBackMatter';

export default function AboutReferences() {
    return <AboutBackMatter />;
}