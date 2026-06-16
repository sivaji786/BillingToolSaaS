import { useEffect } from 'react';

export function SAMenus() {
    useEffect(() => {
        window.location.hash = '#/SAPages';
    }, []);
    return null;
}
