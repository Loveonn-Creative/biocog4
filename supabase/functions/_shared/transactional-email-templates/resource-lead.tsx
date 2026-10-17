import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  resource?: string
  source?: 'form' | 'account'
  name?: string
  email?: string
  company?: string
  industry?: string
  role?: string
  need?: string
  mailbox?: string
  marketing?: boolean
  stored?: boolean
  leadId?: string
  at?: string
}

const ResourceLead = ({ resource, source, name, email, company, industry, role, need, mailbox, marketing, stored, leadId, at }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{source === 'account' ? 'Signed-in download' : 'New report request'}: {company || email || 'a visitor'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>Senseible</Text>
        <Heading style={heading}>{source === 'account' ? 'Signed-in user downloaded' : 'New request for'} {resource || 'a resource'}</Heading>
        <Section style={section}>
          <Text><strong>Name:</strong> {name || 'Not given (signed-in download)'}</Text>
          <Text><strong>Email:</strong> {email || 'Not provided'}</Text>
          <Text><strong>Company:</strong> {company || 'Not given'}</Text>
          <Text><strong>Industry:</strong> {industry || 'Not given'}</Text>
          <Text><strong>Role:</strong> {role || 'Not given'}</Text>
          <Text><strong>Primary need:</strong> {need || 'Not given'}</Text>
          <Text><strong>Mailbox:</strong> {mailbox || 'Unknown'}</Text>
          <Text><strong>Agreed to updates:</strong> {marketing ? 'Yes' : 'No'}</Text>
        </Section>
        <Text style={note}>
          {source === 'account'
            ? 'Downloaded from a signed-in account with a confirmed email.'
            : 'The report link was emailed to this address; it works only for whoever receives it.'}
          {' '}{stored ? `Stored as lead ${leadId}.` : 'Not stored: the resource_leads table is not applied yet.'} {at}
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ResourceLead,
  subject: (data: Record<string, any>) => `[Report request] ${data.company || data.email || 'New lead'}${data.need ? `: ${data.need}` : ''}`,
  displayName: 'Gated resource lead',
  // Sent to the internal inbox held in the INTERNAL_INBOX secret; never shown to visitors.
  toInternal: true,
  previewData: { resource: 'Sample ESG Report 2026', source: 'form', name: 'Asha Rao', email: 'asha@example.com', company: 'Acme Forgings', industry: 'Steel, aluminium and metals', role: 'Founder, owner or CXO', need: 'A buyer asked for ESG or carbon data', mailbox: 'Work domain', marketing: false, stored: true, leadId: 'example' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif', color: '#171717' }
const container = { maxWidth: '560px', padding: '28px 24px' }
const brand = { color: '#184d37', fontWeight: 700 }
const heading = { fontSize: '22px', lineHeight: '30px' }
const section = { borderTop: '2px solid #184d37', paddingTop: '8px', marginTop: '12px' }
const note = { fontSize: '12px', color: '#555555', marginTop: '20px' }
