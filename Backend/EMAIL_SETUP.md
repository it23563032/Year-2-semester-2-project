# Email Configuration Setup

To enable email functionality, you need to set up environment variables for email service.

## For Gmail (Recommended):

1. Create a `.env` file in the Backend directory
2. Add the following variables:

```
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

## How to get Gmail App Password:

1. Go to your Google Account settings
2. Enable 2-Factor Authentication if not already enabled
3. Go to "Security" → "App passwords"
4. Generate an app password for "Mail"
5. Use the generated 16-character password (not your regular Gmail password)

## Example .env file:

```
EMAIL_USER=legalaid.platform@gmail.com
EMAIL_PASS=abcd efgh ijkl mnop
```

## Other Email Services:

You can modify the `createTransporter()` function in `Controllers/EmailController.js` to use other email services like Outlook, Yahoo, or SMTP servers.

## Testing:

Without email configuration, the system will work but emails won't be delivered. You'll see error messages in the server logs, but the email records will still be saved to the database.
