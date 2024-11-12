# The Gist of It - AI-Powered Text Summarization

This Chrome extension uses GPT to provide instant, intelligent summaries of any selected text. Built with [Plasmo](https://docs.plasmo.com/) and powered by OpenAI's GPT models.

## Features

### Current
- One-click text summarization from any selected text
- Automatic length adjustment based on input text
- Secure local API key storage
- Support for large text chunks with smart splitting

### "Planned" Features

I don't like to commit to long-term plans, but here are some ideas I'm currently kicking around.
Do not expect these to be implemented anytime soon or ever.
Simply brainstorming out loud.

#### URL-based Summarization
- Right-click on a link and select "Summarize this page", ingests the page as markdown and summarizes it.

#### Multi-Modal Summaries
- YouTube video transcript summarization
- PDF document summarization

#### Research Assistant Mode
- Key quote extraction

#### Knowledge Base Features
- Topic-based summary organization
- Tagging and categorization
- Summary hybrid (keyword and vector) search functionality
- Summary export as markdown

## Getting Started

1. Clone the repository
2. Install dependencies:

```bash
pnpm install
# or
npm install
```

3. Run the development server:

```bash
pnpm dev
# or
npm run dev
```

Open your browser and load the appropriate development build. For example, if you are developing for the chrome browser, using manifest v3, use: `build/chrome-mv3-dev`.

You can start editing the popup by modifying `popup.tsx`. It should auto-update as you make changes. To add an options page, simply add a `options.tsx` file to the root of the project, with a react component default exported. Likewise to add a content page, add a `content.ts` file to the root of the project, importing some module and do some logic, then reload the extension on your browser.

For further guidance, [visit our Documentation](https://docs.plasmo.com/)

## Making production build

Run the following:

```bash
pnpm build
# or
npm run build
```

This should create a production bundle for your extension, ready to be zipped and published to the stores.

## Submit to the webstores

The easiest way to deploy your Plasmo extension is to use the built-in [bpp](https://bpp.browser.market) GitHub action. Prior to using this action however, make sure to build your extension and upload the first version to the store to establish the basic credentials. Then, simply follow [this setup instruction](https://docs.plasmo.com/framework/workflows/submit) and you should be on your way for automated submission!
