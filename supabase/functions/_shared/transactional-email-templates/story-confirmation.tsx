import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Link, Preview, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props { hook?: string; withdrawUrl?: string; attribution?: string }

// Sent only to the person who submitted the story.
const StoryConfirmation = ({ hook, withdrawUrl, attribution }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Thank you. Your story is with our editors.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>Senseible</Text>
        <Heading style={heading}>Thank you for sharing your story</Heading>
        <Text>“{hook}”</Text>
        <Text>Our editors read every story before anything goes live. We publish the version you approved ({attribution === 'anonymous' ? 'anonymous' : attribution === 'company' ? 'company name only' : 'with your name and company'}), and we email you when it is up.</Text>
        <Text>Changed your mind? You can withdraw at any time, before or after it is published. It comes down within 7 business days.</Text>
        <Text><Link href={withdrawUrl}>Withdraw my story</Link></Text>
        <Text style={note}>Keep this email: the link above is how you withdraw. Questions? Reply to this email, or see how to reach us in our <Link href="https://senseible.earth/legal/privacy">Privacy Policy</Link>.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: StoryConfirmation,
  subject: 'Your Senseible story is with our editors',
  displayName: 'Customer story confirmation',
  previewData: { hook: 'A buyer asked for carbon data. There was nothing to send.', withdrawUrl: 'https://senseible.earth/case-studies/withdraw?t=example', attribution: 'anonymous' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif', color: '#171717' }
const container = { maxWidth: '560px', padding: '28px 24px' }
const brand = { color: '#184d37', fontWeight: 700 }
const heading = { fontSize: '24px', lineHeight: '32px' }
const note = { fontSize: '12px', color: '#555555', marginTop: '24px' }
