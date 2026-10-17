import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  id?: string; publish?: boolean; buyer?: string; industry?: string; attribution?: string; hook?: string; dek?: string
  chapters?: { title: string; text: string }[]; numbers?: { label: string; value: string; unit: string; basisLabel: string }[]
  quote?: string; moment?: string; email?: string; name?: string; company?: string; reviewUrl?: string
}

const StoryReceived = (p: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{p.publish ? 'New story to review' : 'New private feedback'}: {p.hook || ''}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>Senseible</Text>
        <Heading style={heading}>{p.publish ? 'A customer story is waiting for review' : 'Private feedback (not for publication)'}</Heading>
        <Text><strong>{p.hook}</strong></Text>
        <Text>{p.dek}</Text>
        <Section style={section}>
          {(p.chapters || []).map((c, i) => <Text key={i}><strong>{c.title}:</strong> {c.text}</Text>)}
          {p.moment && <Text><strong>In their words:</strong> “{p.moment}”</Text>}
          {p.quote && <Text><strong>Quote:</strong> “{p.quote}”</Text>}
          {(p.numbers || []).map((n, i) => <Text key={i}>{n.label}: {n.value} {n.unit} ({n.basisLabel})</Text>)}
        </Section>
        <Text><strong>Who:</strong> {p.buyer} · {p.industry} · attribution {p.attribution}</Text>
        <Text><strong>Name:</strong> {p.name} · <strong>Company:</strong> {p.company} · <strong>Email:</strong> {p.email}</Text>
        {p.publish && <Text>Review and publish: {p.reviewUrl}</Text>}
        <Text style={note}>Reference {p.id}. Nothing is public until an admin publishes it.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: StoryReceived,
  subject: (d: Record<string, any>) => `[Customer story] ${d.publish ? 'Review' : 'Private feedback'}: ${d.hook || d.industry || 'new submission'}`,
  displayName: 'Customer story received',
  // Sent to the internal inbox held in the INTERNAL_INBOX secret; never shown to visitors.
  toInternal: true,
  previewData: { id: 'example', publish: true, buyer: 'msme', industry: 'Textiles and apparel', attribution: 'anonymous', hook: 'A buyer asked for carbon data. There was nothing to send.', dek: 'How a textiles manufacturer…', chapters: [{ title: 'The problem', text: 'Before Senseible…' }], email: 'owner@example.com', name: 'Not given', company: 'Not given', reviewUrl: 'https://senseible.earth/admin/stories' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif', color: '#171717' }
const container = { maxWidth: '600px', padding: '28px 24px' }
const brand = { color: '#184d37', fontWeight: 700 }
const heading = { fontSize: '22px', lineHeight: '30px' }
const section = { borderTop: '2px solid #184d37', paddingTop: '8px', marginTop: '12px' }
const note = { fontSize: '12px', color: '#555555', marginTop: '20px' }
