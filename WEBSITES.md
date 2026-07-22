# About

This document is meant to store everything that I have done for my websites, both as a reminder for myself and for anyone interested in knowing my setup.

# Table of Contents

- [About](#about)
- [Table of Contents](#table-of-contents)
- [Websites and their Uses](#websites-and-their-uses)
- [Important Data and Where to Find it](#important-data-and-where-to-find-it)
  - [Personal Domain](#personal-domain)
  - [Deployed Websites](#deployed-websites)
  - [Authentication](#authentication)
  - [Data Asset Storage](#data-asset-storage)

# Websites and their Uses

- **Vercel:** host my personal projects on the hobby plan for free deployment, SSL, and monitoring
- **name.com:** bought my `.dev` domain from here
- **Supabase:** control OAuth for my websites, and host any SQL data through Postgres
- **Cloudflare:** host any larger media like video files through a bucket, as well as maintain the DNS records for my domains and subdomains
- **Resend:** email sending service for my personal contact form as well as any emails for my personal projects
- **Google Cloud Platform:** projects on this are used for Google OAuth (connected to Supabase as a provider) as well as creating keys to access Google information like giving calendar access for personal projects
- **GitHub:** GitHub OAuth projects are used for more OAuth (connected to Supabase as a provider)

# Important Data and Where to Find it

## Personal Domain

Cloudflare is the source of truth for every domain that I have thanks to it storing the DNS records.

All subdomains that I use are viewable through cloudflare.

name.com is purely the company I am paying for access to the domain. Their nameservers settings point to Cloudflare so it handles everything. Important note: cloudflare proxy is not used because it could mess up with Vercel's hosting, so I don't have cloudflare protection - Vercel handles that.

## Deployed Websites

Any of the actual websites are on Vercel. They will show the connected domains in the domains tab, matching to the registered domains in Cloudflare.

## Authentication

Currently, Supabase is the source of truth for all authentication.

Two projects exist (since that's all I get for the free plan). One contains the less sensitive information and has its own OAuth. The second contains more sensitive information (like people's emails and my calendar keys), so it was separated to ensure that if one key is exposed, the other is safe.

GCP and GitHub contain the actual setup for OAuth since those are the providers that I use.

GCP also contains a specific OAuth for allowing access to specified Google data such as reading Google Calendar. This is separate from OAuth but an important authentication mechanism that lives only within GCP.

## Data Asset Storage

For most applications, Supabase is used. As mentioned above, two projects exist within Supabase, and different personal projects of mine use either of them. This rule is valid for all SQL-related data.

For blobs like videos (as of July 2026, this is the only file format here), they exist in Cloudflare R2 buckets. These give 10GB free storage with no egress, so I'm not paying for bandwidth when people watch the videos.

For any other photos, I try and keep smaller files within the application itself under the `/public` folder. Should the need arise, I would move large photos or other assets to R2.
