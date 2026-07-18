'use server';

import { CONTACT_FROM, getResendClient } from '@/lib/resend';
import { createClient } from '@/lib/supabase/server';

import { type ContactFieldErrors, validateContactForm } from './validation';

export interface ContactFormResult {
  success?: boolean;
  message?: string;
  fieldErrors?: ContactFieldErrors;
}

const GENERIC_FAILURE_MESSAGE =
  'Sorry, we could not send your email for some reason. We will investigate this and email you when it is fixed.';

async function logSubmission(record: {
  name: string;
  email: string;
  message: string;
  send_copy: boolean;
  status: 'sent' | 'failed';
  error_message?: string;
}) {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('contact_submissions').insert(record);
    if (error) throw error;
  } catch (err) {
    console.error('[contact] FAILED TO LOG SUBMISSION TO SUPABASE', {
      record,
      err,
    });
  }
}

export async function submitContactForm(
  _prevState: ContactFormResult | undefined,
  formData: FormData,
): Promise<ContactFormResult> {
  const name = String(formData.get('name') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim();
  const message = String(formData.get('message') ?? '').trim();
  const sendCopy = formData.get('sendCopy') === 'on';

  const fieldErrors = validateContactForm({ name, email, message });
  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  const contactEmailTo = process.env.CONTACT_EMAIL_TO;
  if (!contactEmailTo) {
    console.error('[contact] Missing required env var: CONTACT_EMAIL_TO');
    return { success: false, message: GENERIC_FAILURE_MESSAGE };
  }

  try {
    const resend = getResendClient();

    const { error: sendError } = await resend.emails.send({
      from: CONTACT_FROM,
      to: [contactEmailTo],
      replyTo: email,
      subject: `New contact form message from ${name}`,
      text: `Name: ${name}\nEmail: ${email}\n\n${message}`,
    });
    if (sendError) throw sendError;

    if (sendCopy) {
      // Best-effort - the submitter's own copy failing shouldn't fail the
      // whole submission, since the primary email (to the site owner) is
      // what actually matters.
      const { error: copyError } = await resend.emails.send({
        from: CONTACT_FROM,
        to: [email],
        subject: 'Copy of your message to Kyle Hagerman',
        text: `Here's a copy of the message you sent:\n\n${message}`,
      });
      if (copyError) {
        console.error('[contact] Failed to send copy to submitter', {
          email,
          copyError,
        });
      }
    }

    await logSubmission({
      name,
      email,
      message,
      send_copy: sendCopy,
      status: 'sent',
    });

    return {
      success: true,
      message:
        'Success, email was sent. I will reply within a few business days.',
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);

    console.error('=== CONTACT FORM SEND FAILURE ===', { name, email, err });

    await logSubmission({
      name,
      email,
      message,
      send_copy: sendCopy,
      status: 'failed',
      error_message: errorMessage,
    });

    // Best-effort alert to the site owner. If Resend itself is the thing
    // that's down, this will also fail - that's expected, and the loud
    // console.error below is the fallback so it's still obvious in logs.
    try {
      const resend = getResendClient();
      await resend.emails.send({
        from: CONTACT_FROM,
        to: [contactEmailTo],
        replyTo: email,
        subject: `[ALERT] Contact form failed to send (from ${name} <${email}>)`,
        text: `A contact form submission failed to send.\n\nFrom: ${name} <${email}>\nMessage:\n${message}\n\nError: ${errorMessage}`,
      });
    } catch (alertErr) {
      console.error(
        '=== CONTACT FORM ALERT EMAIL ALSO FAILED - CHECK RESEND STATUS ===',
        { name, email, alertErr },
      );
    }

    return { success: false, message: GENERIC_FAILURE_MESSAGE };
  }
}
