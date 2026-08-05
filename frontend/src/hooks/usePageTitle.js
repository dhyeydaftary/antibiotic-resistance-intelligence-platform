import { useEffect } from 'react';

export default function usePageTitle(title) {
    useEffect(() => {
        document.title = title ? `${title} | AMR-Insight` : 'AMR-Insight';
    }, [title]);
}