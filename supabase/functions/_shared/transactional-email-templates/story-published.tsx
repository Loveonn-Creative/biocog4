import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Link, Preview, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props { hook?: string; url?: string; withdrawUrl?: string }

const StoryPublished = ({ hook, url, withdrawUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your story is live on senseible.earth</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>Senseible</Text>
        <Heading style={heading}>Your story is live</Heading>
        <Text>“{hook}”</Text>
        <Button href={url} style={button}>Read it</Button>
        <Text>Thank you for helping other businesses see what clear carbon data makes possible.</Text>
        <Text style={note}>You can withdraw it at any time: <Link href={withdrawUrl}>withdraw my story</Link>. It comes down within 7 business days.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: StoryPublished,
  subject: 'Your story is live on senseible.earth',
  displayName: 'Customer story published',
  previewData: { hook: 'A buyer asked for carbon data. There was nothing to send.', url: 'https://senseible.earth/case-studies/example', withdrawUrl: 'https://senseible.earth/case-studies/withdraw?t=example' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif', color: '#171717' }
const container = { maxWidth: '560px', padding: '28px 24px' }
const brand = { color: '#184d37', fontWeight: 700 }
const heading = { fontSize: '24px', lineHeight: '32px' }
const button = { backgroundColor: '#184d37', color: '#ffffff', padding: '12px 22px', borderRadius: '999px', fontWeight: 700, textDecoration: 'none', display: 'inline-block', margin: '8px 0 16px' }
const note = { fontSize: '12px', color: '#555555', marginTop: '24px' }
