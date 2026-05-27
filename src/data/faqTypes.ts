export interface FaqEntry {
    id: string;
    category: string;
    keywords: string[];
    question: string;
    answer: string;
    related?: string[];
}

export interface CategoryDef {
    id: string;
    label: string;
    emoji: string;
}

export interface LocalizedBot {
    faq: FaqEntry[];
    categories: CategoryDef[];
    welcomeText: string;
}
