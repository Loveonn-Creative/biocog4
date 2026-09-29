import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  name?: string
  email?: string
  phone?: string
  company?: string
  message?: string
  estimate?: string
  drivers?: string[]
  requestId?: string
}

const ScopeReview = ({ name, email, phone, company, message, estimate, drivers, requestId }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Custom scope review request from {name || 'a visitor'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>Senseible</Text>
        <Heading style={heading}>Custom scope review</Heading>
        <Text>Request reference: {requestId || 'Not available'}</Text>
        <Text><strong>Name:</strong> {name || 'Not provided'}</Text>
        <Text><strong>Email:</strong> {email || 'Not provided'}</Text>
        {company && <Text><strong>Company:</strong> {company}</Text>}
        {phone && <Text><strong>Phone:</strong> {phone}</Text>}
        <Section style={section}>
          <Text style={range}>{estimate || 'Range unavailable'}</Text>
          {(drivers || []).map((driver, index) => <Text key={index}>{driver}</Text>)}
        </Section>
        <Text><strong>Client message:</strong></Text>
        <Text style={{ whiteSpace: 'pre-wrap' }}>{message || 'No additional message'}</Text>
        <Text style={note}>Estimate only. Final pricing depends on confirmed scope, integrations, data volume and technical requirements.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ScopeReview,
  subject: 'Senseible custom scope review request',
  displayName: 'Custom scope review',
  to: 'impact@senseible.earth',
  previewData: { name: 'Example client', email: 'client@example.com', estimate: '₹1,00,000 to ₹2,50,000', drivers: ['New system integration × 1'] },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif', color: '#171717' }
const container = { maxWidth: '560px', padding: '28px 24px' }
const brand = { color: '#184d37', fontWeight: 700 }
const heading = { fontSize: '24px', lineHeight: '32px' }
const section = { borderTop: '2px solid #184d37', paddingTop: '12px', marginTop: '20px' }
const range = { fontWeight: 700, fontSize: '20px' }
const note = { fontSize: '12px', color: '#555555', marginTop: '24px' }