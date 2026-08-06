// UNUSED — grep confirms no file imports AboutMetadata. A leftover
// alias re-rendering AboutBackMatter verbatim; AboutPage.jsx renders
// AboutBackMatter directly instead.
import AboutBackMatter from './AboutBackMatter';

export default function AboutMetadata() {
    return <AboutBackMatter />;
}