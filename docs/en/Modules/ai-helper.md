# AI Helper — Implementation Guide

This document covers two approaches:
- **No-AI (rule-based)** — works offline, instant, no API key, recommended for app-usage Q&A
- **AI-powered (Gemini)** — for open-ended or unpredictable questions

---

## Table of Contents

1. [Approach Comparison](#1-approach-comparison)
2. [No-AI: How It Works](#2-no-ai-how-it-works)
3. [No-AI: FAQ Data File](#3-no-ai-faq-data-file)
4. [No-AI: Matching Engine](#4-no-ai-matching-engine)
5. [No-AI: Chat Component](#5-no-ai-chat-component)
6. [No-AI: Decision Tree (Button Flow)](#6-no-ai-decision-tree-button-flow)
7. [AI-Powered: How It Works](#7-ai-powered-how-it-works)
8. [AI-Powered: Why the Current Bot Is Not Conversational](#8-ai-powered-why-the-current-bot-is-not-conversational)
9. [AI-Powered: Making It Multi-Turn](#9-ai-powered-making-it-multi-turn)
10. [FloatingDock Integration](#10-floatingdock-integration)

---

## 1. Approach Comparison

| | No-AI (Rule-based) | AI-powered (Gemini) |
|---|---|---|
| **Works offline** | Yes | No |
| **Needs API key** | No | Yes (GEMINI_API_KEY) |
| **Response latency** | ~0 ms | 1–3 seconds |
| **Cost** | Free forever | Free tier: 1,500 req/day |
| **Handles typos** | Partial (fuzzy score) | Yes |
| **Handles unknown questions** | No — falls back to "not found" | Yes |
| **Stays on-topic** | Always | Needs careful system prompt |
| **Easy to update** | Yes — edit one JSON file | Yes — edit system prompt |
| **Multilingual** | Only if you write all languages | Yes |
| **Best for** | Known, finite FAQ | Open-ended, unpredictable questions |

**Recommendation:** Use the no-AI approach first. It covers 90% of real support questions, is instant, and is trivially maintainable. Add the AI layer only when users ask things you didn't anticipate.

---

## 2. No-AI: How It Works

The bot holds a list of FAQ entries. When the user sends a message, the engine:

1. Lowercases and tokenises the input into words
2. Scores each FAQ entry by counting how many of its keywords appear in the input
3. Returns the entry with the highest score above a threshold
4. If no entry scores above the threshold, shows a fallback + suggested categories

```
User: "how do i delete a buyer"
          ↓
Tokenise → ["how", "do", "i", "delete", "a", "buyer"]
          ↓
Score each FAQ entry:
  "add buyer"    → keywords: [add, buyer, client, new]      → 1 match (buyer)  → score 1
  "delete buyer" → keywords: [delete, remove, buyer, client] → 2 matches        → score 2  ✓
          ↓
Return answer for "delete buyer"
```

No server call. No API key. Runs entirely in the browser.

---

## 3. No-AI: FAQ Data File

Create `src/data/helpFaq.ts`. Each entry has keywords (words to match on), a display question, and a markdown-friendly answer.

```ts
// src/data/helpFaq.ts

export interface FaqEntry {
    id: string;
    category: 'invoices' | 'buyers' | 'letters' | 'profile' | 'billing' | 'tickets' | 'admin' | 'ai';
    keywords: string[];       // lowercase words that trigger this entry
    question: string;         // shown as the entry title
    answer: string;           // plain text, newlines supported
    related?: string[];       // ids of related entries shown after the answer
}

export const FAQ: FaqEntry[] = [
    // ── Invoices ──────────────────────────────────────────────────────────
    {
        id: 'invoice-create',
        category: 'invoices',
        keywords: ['create', 'new', 'make', 'add', 'invoice', 'invoices'],
        question: 'How do I create an invoice?',
        answer: 'Go to Invoices in the sidebar and click "New Invoice".\nFill in the buyer, line items, tax rate and due date.\nClick Save — the invoice is saved as a draft.\nYou can then preview or download it as a PDF.',
        related: ['invoice-pdf', 'invoice-share'],
    },
    {
        id: 'invoice-edit',
        category: 'invoices',
        keywords: ['edit', 'update', 'change', 'modify', 'invoice'],
        question: 'How do I edit an invoice?',
        answer: 'Open the invoice from the Invoices list and click the Edit (pencil) icon.\nMake your changes and click Save.\nNote: invoices that have been sent or paid are locked — duplicate them instead.',
        related: ['invoice-create'],
    },
    {
        id: 'invoice-delete',
        category: 'invoices',
        keywords: ['delete', 'remove', 'trash', 'invoice'],
        question: 'How do I delete an invoice?',
        answer: 'In the Invoices list, hover the row and click the trash icon on the right.\nA confirmation dialog will appear before deletion.\nDeleted invoices cannot be recovered.',
    },
    {
        id: 'invoice-pdf',
        category: 'invoices',
        keywords: ['pdf', 'download', 'export', 'print', 'invoice'],
        question: 'How do I download an invoice as PDF?',
        answer: 'Open the invoice and click the Preview button.\nOn the preview screen, click Download PDF in the top-right corner.',
        related: ['invoice-share'],
    },
    {
        id: 'invoice-share',
        category: 'invoices',
        keywords: ['share', 'send', 'link', 'email', 'invoice', 'client'],
        question: 'How do I share an invoice with a client?',
        answer: 'Open the invoice preview and click Share.\nThis generates a unique public link you can copy and send to your client.\nThe client can view the invoice without logging in.',
    },
    {
        id: 'invoice-status',
        category: 'invoices',
        keywords: ['status', 'draft', 'sent', 'paid', 'overdue', 'invoice'],
        question: 'What do the invoice statuses mean?',
        answer: 'Draft — saved but not yet sent.\nSent — shared with the client.\nPaid — marked as received.\nOverdue — past due date and not yet paid.',
    },
    {
        id: 'invoice-tax',
        category: 'invoices',
        keywords: ['tax', 'vat', 'percent', 'rate', 'invoice'],
        question: 'How do I set the tax / VAT rate?',
        answer: 'On each invoice line item you can set a tax percentage (e.g. 19%).\nThe tax total is calculated automatically.\nDifferent line items can have different tax rates.',
    },
    // ── Buyers ────────────────────────────────────────────────────────────
    {
        id: 'buyer-add',
        category: 'buyers',
        keywords: ['add', 'create', 'new', 'buyer', 'client', 'customer', 'contact'],
        question: 'How do I add a buyer / client?',
        answer: 'Go to Buyers in the sidebar and click "New Buyer".\nFill in the company name, address and contact details.\nClick Save. The buyer is now available when creating invoices.',
        related: ['buyer-delete'],
    },
    {
        id: 'buyer-edit',
        category: 'buyers',
        keywords: ['edit', 'update', 'change', 'buyer', 'client', 'customer'],
        question: 'How do I edit a buyer?',
        answer: 'In the Buyers list, click the buyer row to open their details.\nClick Edit, make your changes, and click Save.',
    },
    {
        id: 'buyer-delete',
        category: 'buyers',
        keywords: ['delete', 'remove', 'buyer', 'client', 'customer'],
        question: 'How do I delete a buyer?',
        answer: 'In the Buyers list, hover the row and click the trash icon.\nBuyers that are linked to existing invoices cannot be deleted until those invoices are removed.',
    },
    // ── Company Profile ───────────────────────────────────────────────────
    {
        id: 'profile-setup',
        category: 'profile',
        keywords: ['profile', 'company', 'sender', 'logo', 'setup', 'name', 'address'],
        question: 'How do I set up my company profile?',
        answer: 'Go to Settings → Company Profile.\nEnter your company name, address, contact email and phone.\nOptionally upload your logo.\nThis information appears as the sender on all invoices.',
    },
    // ── Business Letters ──────────────────────────────────────────────────
    {
        id: 'letter-create',
        category: 'letters',
        keywords: ['letter', 'business', 'compose', 'write', 'create', 'draft'],
        question: 'How do I create a business letter?',
        answer: 'Go to Letters in the sidebar and click "New Letter".\nYou can type the content manually or use the AI assistant to compose it from a description.\nSave as draft or download as PDF.',
        related: ['ai-letter'],
    },
    // ── AI Assistant ──────────────────────────────────────────────────────
    {
        id: 'ai-invoice',
        category: 'ai',
        keywords: ['ai', 'assistant', 'voice', 'speak', 'natural', 'language', 'auto', 'generate', 'invoice'],
        question: 'How do I use the AI invoice assistant?',
        answer: 'Click the purple sparkle button (✨) in the bottom-right corner.\nType or speak your invoice in plain language, e.g.:\n"Invoice for ABC Ltd — 10 bags cement @ 700 EUR + 19% VAT"\nThe AI fills in the invoice form automatically.\nReview the result and click "Use This Invoice".',
        related: ['ai-voice'],
    },
    {
        id: 'ai-voice',
        category: 'ai',
        keywords: ['voice', 'microphone', 'mic', 'speak', 'dictate', 'speech'],
        question: 'How do I use voice input in the AI assistant?',
        answer: 'Open the AI assistant (✨ button, bottom-right).\nClick the microphone icon in the input area.\nSpeak your invoice request — it will be transcribed automatically.\nClick Send when done.\nNote: voice input requires Chrome or Edge and microphone permission.',
    },
    {
        id: 'ai-letter',
        category: 'ai',
        keywords: ['ai', 'letter', 'compose', 'write', 'generate'],
        question: 'Can the AI write a business letter for me?',
        answer: 'Yes. Open a new or existing letter and click the AI assistant button.\nDescribe the letter you need, e.g.:\n"Payment reminder to John GmbH for invoice INV-2026-001 due last week"\nThe AI generates the letter body which you can edit before saving.',
    },
    // ── Support Tickets ───────────────────────────────────────────────────
    {
        id: 'ticket-create',
        category: 'tickets',
        keywords: ['ticket', 'support', 'bug', 'issue', 'report', 'problem', 'help', 'request'],
        question: 'How do I report a bug or request a feature?',
        answer: 'Click the Support button in the bottom-right corner of any page.\nDescribe the issue and set a priority level.\nOptionally include a screenshot — click the camera icon to capture your current screen.\nClick Submit. The support team will be notified.',
        related: ['ticket-screenshot'],
    },
    {
        id: 'ticket-screenshot',
        category: 'tickets',
        keywords: ['screenshot', 'capture', 'screen', 'ticket', 'attach', 'image'],
        question: 'How do I attach a screenshot to a ticket?',
        answer: 'Open the support ticket widget (Support button, bottom-right).\nClick "Take Screenshot" — the app captures the current screen automatically.\nYou can annotate it with arrows, rectangles and freehand drawing before submitting.\nYou can also attach files (images, PDFs up to 10 MB) using the paperclip icon.',
    },
    // ── Billing & Subscriptions ───────────────────────────────────────────
    {
        id: 'billing-plan',
        category: 'billing',
        keywords: ['billing', 'plan', 'subscription', 'upgrade', 'payment', 'invoice', 'cost', 'price'],
        question: 'How do I upgrade my subscription plan?',
        answer: 'Go to Settings → Billing.\nYou can see your current plan and compare available plans.\nClick Upgrade to select a new plan and complete payment.',
    },
    {
        id: 'billing-history',
        category: 'billing',
        keywords: ['billing', 'history', 'payment', 'receipt', 'past', 'invoice'],
        question: 'Where can I see past payments?',
        answer: 'Go to Settings → Billing → Payment History.\nAll past payments and invoices are listed there with dates and amounts.',
    },
    // ── Admin ─────────────────────────────────────────────────────────────
    {
        id: 'admin-users',
        category: 'admin',
        keywords: ['admin', 'user', 'users', 'manage', 'invite', 'role', 'permission'],
        question: 'How do I manage users and roles? (Admin)',
        answer: 'Go to the Admin Portal (top-right user menu → Admin Portal).\nUnder Users you can invite new users and assign roles.\nRoles control which features each user can access.',
    },
    {
        id: 'audit-log',
        category: 'admin',
        keywords: ['audit', 'log', 'history', 'changes', 'who', 'modified'],
        question: 'Where can I see who changed what?',
        answer: 'Go to Settings → Audit Logs.\nEvery create, edit and delete action is logged with the user name, timestamp and what changed.',
    },
];

export const CATEGORIES = [
    { id: 'invoices', label: 'Invoices',    emoji: '🧾' },
    { id: 'buyers',   label: 'Buyers',      emoji: '👤' },
    { id: 'letters',  label: 'Letters',     emoji: '✉️'  },
    { id: 'ai',       label: 'AI Assistant',emoji: '✨' },
    { id: 'tickets',  label: 'Support',     emoji: '🎫' },
    { id: 'billing',  label: 'Billing',     emoji: '💳' },
    { id: 'profile',  label: 'Profile',     emoji: '🏢' },
    { id: 'admin',    label: 'Admin',       emoji: '⚙️'  },
];
```

---

## 4. No-AI: Matching Engine

Create `src/lib/helpMatcher.ts`:

```ts
// src/lib/helpMatcher.ts
import { FAQ, FaqEntry } from '../data/helpFaq';

const STOP_WORDS = new Set(['how', 'do', 'i', 'a', 'an', 'the', 'is', 'to', 'can', 'what', 'where', 'why', 'my', 'me']);

function tokenise(text: string): string[] {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 1 && !STOP_WORDS.has(w));
}

export function findBestMatch(query: string): FaqEntry | null {
    const tokens = tokenise(query);
    if (!tokens.length) return null;

    let best: FaqEntry | null = null;
    let bestScore = 0;

    for (const entry of FAQ) {
        // Count how many query tokens appear in this entry's keywords
        const score = tokens.filter(t => entry.keywords.includes(t)).length;
        // Normalise by entry keyword count so short-keyword entries don't dominate
        const normalised = score / Math.sqrt(entry.keywords.length);
        if (normalised > bestScore) {
            bestScore = normalised;
            best = entry;
        }
    }

    // Require at least 1 matching keyword
    return bestScore > 0 ? best : null;
}

export function getByCategory(category: string): FaqEntry[] {
    return FAQ.filter(e => e.category === category);
}

export function getById(id: string): FaqEntry | undefined {
    return FAQ.find(e => e.id === id);
}
```

---

## 5. No-AI: Chat Component

Create `src/components/HelpChatBot.tsx`. This is a fully self-contained component — no API calls, no backend:

```tsx
// src/components/HelpChatBot.tsx
import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import { useDockSlot } from '../hooks/useDockSlot';
import { HelpCircle, X, Send, ChevronRight } from 'lucide-react';
import { findBestMatch, getByCategory, getById } from '../lib/helpMatcher';
import { CATEGORIES, FaqEntry } from '../data/helpFaq';

interface Message {
    id: string;
    role: 'user' | 'bot';
    text: string;
    quickReplies?: string[];   // button labels the user can click
    faqId?: string;            // if this message is an answer, store the faq id
}

const WELCOME: Message = {
    id: 'welcome',
    role: 'bot',
    text: 'Hi! I can help you with any questions about the application.\nPick a topic or type your question below.',
    quickReplies: CATEGORIES.map(c => `${c.emoji} ${c.label}`),
};

function makeId() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

export function HelpChatBot() {
    const [isOpen, setIsOpen]     = useState(false);
    const [messages, setMessages] = useState<Message[]>([WELCOME]);
    const [input, setInput]       = useState('');
    const bottomRef               = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    function pushBotMessage(text: string, quickReplies?: string[], faqId?: string) {
        setMessages(prev => [...prev, { id: makeId(), role: 'bot', text, quickReplies, faqId }]);
    }

    function handleAnswer(entry: FaqEntry) {
        const related = entry.related
            ?.map(id => getById(id))
            .filter(Boolean) as FaqEntry[];

        pushBotMessage(
            entry.answer,
            related?.length
                ? ['🔙 Main menu', ...related.map(r => `➡️ ${r.question}`)]
                : ['🔙 Main menu'],
            entry.id,
        );
    }

    function handleInput(text: string) {
        const trimmed = text.trim();
        if (!trimmed) return;

        setMessages(prev => [...prev, { id: makeId(), role: 'user', text: trimmed }]);
        setInput('');

        // Check if the user clicked a quick-reply button for a category
        const cat = CATEGORIES.find(c => trimmed.includes(c.label));
        if (cat) {
            const entries = getByCategory(cat.id);
            pushBotMessage(
                `Here are common ${cat.label} questions:`,
                entries.map(e => `❓ ${e.question}`),
            );
            return;
        }

        // Check if quick-reply matches a known question exactly
        const byQuestion = CATEGORIES.flatMap(c => getByCategory(c.id))
            .find(e => trimmed.includes(e.question));
        if (byQuestion) { handleAnswer(byQuestion); return; }

        // Check for main menu
        if (trimmed.toLowerCase().includes('main menu') || trimmed.toLowerCase().includes('back')) {
            setMessages(prev => [...prev, { ...WELCOME, id: makeId() }]);
            return;
        }

        // Keyword match
        const match = findBestMatch(trimmed);
        if (match) {
            handleAnswer(match);
        } else {
            pushBotMessage(
                "I couldn't find an answer for that. Try picking a category or rephrasing your question.",
                CATEGORIES.map(c => `${c.emoji} ${c.label}`),
            );
        }
    }

    // FloatingDock registration (order 4, above edit-mode bar)
    const ping = useDockSlot('help-bot', 4, () =>
        isOpen ? null : (
            <button
                onClick={() => setIsOpen(true)}
                style={{
                    width: 48, height: 48, borderRadius: '9999px',
                    background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
                    border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
                }}
                title="App Help"
            >
                <HelpCircle style={{ width: 22, height: 22, color: 'white' }} />
            </button>
        )
    );
    useEffect(() => { ping(); }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
            width: 'min(380px, calc(100vw - 3rem))',
            height: 'min(540px, calc(100vh - 6rem))',
            background: 'white', borderRadius: 16,
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)',
            border: '1.5px solid #e0e7ff',
            display: 'flex', flexDirection: 'column',
        }}>
            {/* Header */}
            <div style={{
                background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
                padding: '14px 16px', borderRadius: '14px 14px 0 0',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'white', fontWeight: 600, fontSize: 15 }}>
                    <HelpCircle style={{ width: 18, height: 18 }} />
                    Help Centre
                </div>
                <button
                    onClick={() => setIsOpen(false)}
                    style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 6, padding: 4, cursor: 'pointer', display: 'flex' }}
                >
                    <X style={{ width: 18, height: 18, color: 'white' }} />
                </button>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {messages.map(msg => (
                    <div key={msg.id}>
                        {/* Bubble */}
                        <div style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                            <div style={{
                                maxWidth: '82%', padding: '9px 13px', fontSize: 13, lineHeight: 1.55,
                                borderRadius: 12, whiteSpace: 'pre-wrap',
                                background: msg.role === 'user' ? '#6366f1' : '#f1f5f9',
                                color:      msg.role === 'user' ? 'white'   : '#1e293b',
                                borderBottomRightRadius: msg.role === 'user' ? 3 : 12,
                                borderBottomLeftRadius:  msg.role === 'user' ? 12 : 3,
                            }}>
                                {msg.text}
                            </div>
                        </div>

                        {/* Quick-reply buttons */}
                        {msg.quickReplies && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8, justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                                {msg.quickReplies.map(label => (
                                    <button
                                        key={label}
                                        onClick={() => handleInput(label)}
                                        style={{
                                            padding: '5px 11px', fontSize: 12, borderRadius: 20,
                                            background: 'white', color: '#4f46e5',
                                            border: '1.5px solid #c7d2fe', cursor: 'pointer',
                                            transition: 'all 0.15s',
                                        }}
                                        onMouseEnter={e => { (e.target as HTMLElement).style.background = '#eef2ff'; }}
                                        onMouseLeave={e => { (e.target as HTMLElement).style.background = 'white'; }}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
                <div ref={bottomRef} />
            </div>

            {/* Input */}
            <form
                onSubmit={e => { e.preventDefault(); handleInput(input); }}
                style={{ padding: '10px 14px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: 8 }}
            >
                <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder="Type your question…"
                    style={{
                        flex: 1, padding: '8px 12px', border: '1.5px solid #e2e8f0',
                        borderRadius: 8, fontSize: 13, outline: 'none',
                    }}
                    onFocus={e => { e.target.style.borderColor = '#818cf8'; }}
                    onBlur={e => { e.target.style.borderColor = '#e2e8f0'; }}
                />
                <button
                    type="submit"
                    disabled={!input.trim()}
                    style={{
                        padding: '8px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                        background: !input.trim() ? '#e2e8f0' : 'linear-gradient(135deg, #0ea5e9, #6366f1)',
                        color: 'white', display: 'flex', alignItems: 'center',
                    }}
                >
                    <Send style={{ width: 16, height: 16 }} />
                </button>
            </form>
        </div>
    );
}
```

---

## 6. No-AI: Decision Tree (Button Flow)

The quick-reply buttons already create a guided decision-tree flow without any typing:

```
Bot: "Pick a topic"
     [🧾 Invoices] [👤 Buyers] [✉️ Letters] [✨ AI] …

User clicks [🧾 Invoices]
     ↓
Bot: "Common invoice questions:"
     [❓ How do I create an invoice?]
     [❓ How do I download as PDF?]
     [❓ What do invoice statuses mean?]
     …

User clicks [❓ How do I download as PDF?]
     ↓
Bot: "Open the invoice → Preview → Download PDF in the top-right."
     [🔙 Main menu]  [➡️ How do I share an invoice?]
```

This requires zero typing and works even on mobile. All logic is already in the component above.

---

## 7. AI-Powered: How It Works

The AI assistant (`src/components/GlobalAIAssistant.tsx`) uses **Google Gemini 2.5 Flash** via the backend.

| Step | What Happens |
|------|-------------|
| 1 | User types or speaks a prompt |
| 2 | Frontend sends `POST /api/ai/parse-invoice` with `{prompt, context, templateType, existingInvoice, language}` |
| 3 | Backend calls Gemini with a structured system prompt |
| 4 | Gemini returns JSON → backend validates and calculates totals |
| 5 | Frontend shows the result with a "Use This Invoice" button |

---

## 8. AI-Powered: Why the Current Bot Is Not Conversational

> **The current AI assistant is stateless — each message is independent.**

The backend sends only the current message to Gemini, not the previous turns:

```php
// AIInvoiceController.php — current (single-turn)
'contents' => [
    ['parts' => [['text' => $systemPrompt . "\n\nUser Input: " . $prompt]]]
]
```

Turn 1: "How do I add a buyer?" → Gemini answers correctly.
Turn 2: "What about deleting one?" → Gemini doesn't know what "one" means → wrong answer.

---

## 9. AI-Powered: Making It Multi-Turn

Pass the full conversation history on every request. Gemini natively supports alternating `user` / `model` turns.

### Backend change (`AIInvoiceController.php`)

```php
public function appHelp()
{
    $data    = $this->request->getJSON(true);
    $prompt  = trim($data['prompt'] ?? '');
    $history = $data['history']       ?? [];   // [{role, content}, ...]
    $screen  = $data['currentScreen'] ?? 'unknown';
    $lang    = $data['language']      ?? 'en';

    $systemText = "You are a helpful assistant for BillingTool (billing app). 
        Answer only questions about this application. Language: $lang. Screen: $screen.";

    // Build multi-turn contents array
    $contents   = [];
    $contents[] = ['role' => 'user',  'parts' => [['text' => $systemText]]];
    $contents[] = ['role' => 'model', 'parts' => [['text' => 'Ready to help.']]];

    foreach ($history as $turn) {
        $contents[] = [
            'role'  => $turn['role'] === 'assistant' ? 'model' : 'user',
            'parts' => [['text' => $turn['content']]],
        ];
    }
    $contents[] = ['role' => 'user', 'parts' => [['text' => $prompt]]];

    // ... call Gemini with $contents ...
}
```

### Frontend change (`src/services/api.ts`)

```ts
askAppHelp: async (
    prompt: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }>,
    currentScreen: string,
    language: string
) => {
    const response = await api.post('/ai/app-help', { prompt, history, currentScreen, language });
    return response.data;
},
```

Then in the component, build `history` from existing messages before each call:

```ts
const history = messages
    .filter(m => m.id !== 'welcome')
    .map(m => ({ role: m.role, content: m.content }));

const res = await aiInvoiceService.askAppHelp(text, history, currentScreen, language);
```

---

## 10. FloatingDock Integration

All floating buttons are managed by `src/components/FloatingDock.tsx`. Register any new launcher via `useDockSlot`:

```ts
const ping = useDockSlot('help-bot', 4, () => isOpen ? null : <LauncherButton />);
useEffect(() => { ping(); }, [isOpen]);
```

**Slot order (bottom → top in viewport):**

| Order | Component | Needs API Key |
|-------|-----------|---------------|
| 1 | Support Ticket | No |
| 2 | AI Invoice Assistant | Yes (Gemini) |
| 3 | Edit Mode bar | No |
| 4 | Help Chat Bot | No — rule-based |
