export interface ContactFieldErrors {
  name?: string;
  email?: string;
  message?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateContactForm(input: {
  name: string;
  email: string;
  message: string;
}): ContactFieldErrors {
  const errors: ContactFieldErrors = {};

  if (!input.name) errors.name = 'Please enter your name.';
  if (!EMAIL_REGEX.test(input.email)) {
    errors.email = 'Please enter a valid email address.';
  }
  if (input.message.length < 10) {
    errors.message = 'Please add a bit more detail so I know what you need.';
  }

  return errors;
}
