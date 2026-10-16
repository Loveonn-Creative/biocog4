import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Link, Preview, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  name?: string
  link?: string
  validDays?: number
  title?: string
  pages?: number
}

// Sent only to the person who asked for the resource on senseible.earth.
const ResourceDelivery = ({ name, link, validDays = 7, title = 'Sample ESG Report 2026', pages = 64 }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your {title} is ready to download</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>Senseible</Text>
        <Heading style={heading}>Your {title}</Heading>
        <Text>Hi {name || 'there'},</Text>
        <Text>Here is the {pages}-page sample ESG report you asked for. The link is private to you and works for {validDays} days.</Text>
        <Button href={link} style={button}>Download the report</Button>
        <Text style={small}>If the button does not work, copy this link into your browser:<br />{link}</Text>
        <Text>Three places to start:</Text>
        <Text style={item}>The GRI Content Index and BRSR Core map near the end show which section answers which disclosure.</Text>
        <Text style={item}>The methodology pages list every emission factor and its source, so the numbers can be recomputed.</Text>
        <Text style={item}>The last section has a ready email for sharing a report with buyers and partners.</Text>
        <Text>When you want one built from your own bills and invoices, reply to this email or start at senseible.earth.</Text>
        <Text style={note}>You’re getting this because this address was used to request the report on senseible.earth. We won’t email you again unless you asked for updates. Want your details deleted? Reply to this email, or see how in our <Link href="https://senseible.earth/legal/privacy">Privacy Policy</Link>.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ResourceDelivery,
  subject: (data: Record<string, any>) => `Your ${data.title || 'Sample ESG Report 2026'} from Senseible`,
  displayName: 'Gated resource delivery',
  previewData: { name: 'Asha', link: 'https://senseible.earth/esg-report-sample?access=example', validDays: 7 },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif', color: '#171717' }
const container = { maxWidth: '560px', padding: '28px 24px' }
const brand = { color: '#184d37', fontWeight: 700 }
const heading = { fontSize: '24px', lineHeight: '32px' }
const button = { backgroundColor: '#184d37', color: '#ffffff', padding: '12px 22px', borderRadius: '999px', fontWeight: 700, textDecoration: 'none', display: 'inline-block', margin: '8px 0 16px' }
const small = { fontSize: '12px', color: '#555555', wordBreak: 'break-all' as const }
const item = { margin: '4px 0 4px 12px' }
const note = { fontSize: '12px', color: '#555555', marginTop: '28px' }
