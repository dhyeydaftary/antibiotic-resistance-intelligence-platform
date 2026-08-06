import { useEffect } from 'react';

// Sets document.title to "<title> | AMR-Insight" (or the bare app name if
// no title given) for the lifetime of the calling page.
export default function usePageTitle(title) {
    useEffect(() => {
        document.title = title ? `${title} | AMR-Insight` : 'AMR-Insight';
    }, [title]);
}