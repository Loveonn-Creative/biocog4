import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  name?: string
  email?: string
  whatsapp?: string | null
  city?: string
  lanes?: string[]
  commitment?: string
  firstMove?: string
  workLink?: string | null
  applicationId?: string
}

/** Sent to the program manager for every new Impact Ambassador application. */
const AmbassadorApplication = ({ name, email, whatsapp, city, lanes, commitment, firstMove, workLink, applicationId }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>New Impact Ambassador application from {name || 'an applicant'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>Decarbonize India</Text>
        <Heading style={heading}>New Impact Ambassador application</Heading>
        <Text>Reference: {applicationId || 'Not available'}</Text>
        <Text><strong>Name:</strong> {name || 'Not provided'}</Text>
        <Text><strong>Email:</strong> {email || 'Not provided'}</Text>
        {whatsapp && <Text><strong>WhatsApp:</strong> {whatsapp}</Text>}
        <Text><strong>City:</strong> {city || 'Not provided'}</Text>
        <Text><strong>Lanes:</strong> {(lanes || []).join(', ') || 'Not provided'}</Text>
        <Text><strong>Time:</strong> {commitment || 'Not provided'}</Text>
        <Section style={section}>
          <Text style={label}>Their first move, in their own words</Text>
          <Text style={{ whiteSpace: 'pre-wrap' }}>{firstMove || 'Not provided'}</Text>
        </Section>
        {workLink && <Text><strong>Work they shared:</strong> {workLink}</Text>}
        <Text style={note}>Interview within 7 to 14 days. Reply to this email to reach the applicant.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: AmbassadorApplication,
  subject: (d: Record<string, unknown>) => `Impact Ambassador application: ${String(d.name || 'new applicant')}`,
  displayName: 'Impact Ambassador application',
  to: 'palanisamy@senseible.earth',
  previewData: { name: 'Example applicant', email: 'applicant@example.com', city: 'Tiruppur', lanes: ['Content', 'Talking to MSMEs'], commitment: 'All 90 days', firstMove: 'An example answer written by the applicant.' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif', color: '#171717' }
const container = { maxWidth: '560px', padding: '28px 24px' }
const brand = { color: '#184d37', fontWeight: 700 }
const heading = { fontSize: '24px', lineHeight: '32px' }
const section = { borderTop: '2px solid #184d37', paddingTop: '12px', marginTop: '20px' }
const label = { fontWeight: 700 }
const note = { fontSize: '12px', color: '#555555', marginTop: '24px' }
