// UNUSED — grep confirms no file imports AboutBoundaryList. A leftover
// alias re-rendering AboutTrustBoundary verbatim; AboutPage.jsx renders
// AboutTrustBoundary directly instead.
import AboutTrustBoundary from './AboutTrustBoundary';

export default function AboutBoundaryList() {
    return <AboutTrustBoundary />;
}