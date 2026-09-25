/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head>
      <style>{darkModeCss}</style>
    </Head>
    <Preview>Confirm your email for {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={wordmark}>SENSEIBLE</Text>
        <Heading style={h1}>Confirm your email</Heading>
        <Text style={text}>
          Welcome to{' '}
          <Link href={siteUrl} style={link}>
            <strong>{siteName}</strong>
          </Link>
           .
        </Text>
        <Text style={text}>
          Please confirm your email address (
          <Link href={`mailto:${recipient}`} style={link}>
            {recipient}
          </Link>
           ) to finish setting up your account.
        </Text>
        <Button className="dm-btn" style={button} href={confirmationUrl}>
          Confirm email
        </Button>
        <Text style={footer}>
          If you didn't create an account, you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const main = { backgroundColor: '#f6f8f7', fontFamily: '"Space Grotesk", Arial, sans-serif', padding: '32px 12px' }
const container = { backgroundColor: '#ffffff', border: '1px solid #e8ecea', borderRadius: '12px', maxWidth: '560px', padding: '40px' }
const wordmark = { color: '#1f513b', fontSize: '12px', fontWeight: 'bold' as const, letterSpacing: '1.5px', margin: '0 0 28px' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#141414',
  margin: '0 0 20px',
}
const text = {
  fontSize: '14px',
  color: '#737373',
  lineHeight: '1.5',
  margin: '0 0 25px',
}
const link = { color: '#1f513b', textDecoration: 'underline' }
const button = {
  backgroundColor: '#1f513b',
  color: '#ffffff',
  fontSize: '14px',
  border: '1px solid #1f513b',
  borderRadius: '12px',
  padding: '12px 20px',
  textDecoration: 'none',
}
const footer = { fontSize: '12px', color: '#737373', lineHeight: '1.5', margin: '30px 0 0' }
// Rendered as a text child, which React may HTML-escape: keep this CSS free of >, &, and quotes.
const darkModeCss = `
  @media (prefers-color-scheme: dark) {
    .dm-btn { background-color: #2f7a58 !important; color: #ffffff !important; }
  }
  [data-ogsc] .dm-btn { background-color: #2f7a58 !important; color: #ffffff !important; }
  [data-ogsb] .dm-btn { background-color: #2f7a58 !important; color: #ffffff !important; }
`
