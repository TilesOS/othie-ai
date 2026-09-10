"use client";

import * as Accordion from "@radix-ui/react-accordion";
import { Plus } from "lucide-react";

export type FaqItem = { question: string; answer: string };

export function Faq({ items }: { items: FaqItem[] }) {
  return (
    <Accordion.Root className="faq-list" collapsible type="single">
      {items.map((item) => (
        <Accordion.Item className="faq-item" key={item.question} value={item.question}>
          <Accordion.Header>
            <Accordion.Trigger className="faq-trigger">
              <span>{item.question}</span>
              <Plus aria-hidden="true" size={19} strokeWidth={1.6} />
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content className="faq-content"><div>{item.answer}</div></Accordion.Content>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  );
}
