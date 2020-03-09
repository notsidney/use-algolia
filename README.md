# useAlgolia [![npm latest release](https://badgen.net/npm/v/use-algolia)](https://www.npmjs.com/use-algolia) [![Minified size](https://badgen.net/bundlephobia/min/use-algolia)](https://bundlephobia.com/result?p=use-algolia)

Dead-simple React hook to make Algolia search queries. Supports pagination out
of the box.

![Code snippet](assets/carbon.svg)

## Installation

Requires [React](https://www.npmjs.com/react) >= 16.8.0 and
[algoliasearch](https://www.npmjs.com/algoliasearch) 4.

```
yarn add react algoliasearch use-algolia
```

## Usage

Pass the Algolia app ID, search API key, and index name to the hook call.

Optionally, pass the initial request options as the fourth argument.  
See https://www.algolia.com/doc/api-reference/search-api-parameters/ for all
options.

Access the returned hits, response, loading, and hasMore from `searchState`.

```ts
const [searchState, requestDispatch, getMore] = useAlgolia(
  APP_ID,
  SEARCH_KEY,
  INDEX_NAME,
  { query: 'construction' }
);

const { hits, response, loading, hasMore } = searchState;
```

### Making new requests

Call `requestDispatch` with options to make a new Algolia search request. Note
this will **shallow merge** your previous request options. Making new requests
will immediately reset `hits` to an empty array and set `loading` to true.

```ts
requestDispatch({ query: 'bin chicken' });

// Create a new request with query: 'bin chicken' AND the filters below.
requestDispatch({ filters: 'city:Sydney OR city:Melbourne' });

// Creates a new request, resetting query and filters. Same as retrieving all objects.
requestDispatch({ query: '', filters: '' });
```

### Loading more hits with pagination

Call `getMore` to get the next page of hits. Get all hits from
`searchState.hits`, not `searchState.response.hits`.

You could also manually pass in `page` to `requestDispatch` to get a specific
page or skip pages. Calling `getMore` after doing so will still work.

### Increasing number of hits per page

Include `hitsPerPage` in your request. Initially set to
[Algolia’s default of 20](https://www.algolia.com/doc/api-reference/api-parameters/hitsPerPage/).

```ts
const [searchState, requestDispatch, getMore] = useAlgolia(
  APP_ID,
  SEARCH_KEY,
  INDEX_NAME,
  { hitsPerPage: 100 }
);

// OR after initial query:
requestDispatch({ hitsPerPage: 100 });
```

### Specifying hit type

If you’re using TypeScript, pass the hit type as the generic type parameter.
Hits will have `objectID`.

```ts
type Hit = {
  title: string;
  year: number;
  actors: string[];
};

const [searchState, requestDispatch, getMore] = useAlgolia<Hit>(
  APP_ID,
  SEARCH_KEY,
  INDEX_NAME
);

// hits will have type readonly (Hit & ObjectWithObjectID)[]
const { hits } = searchState;
```

## State

| Key          | Type                           | Description                                                                                                                                                     |
| ------------ | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **hits**     | `(Hit & ObjectWithObjectID)[]` | Contains all hits for search query, including all pages retrieved.                                                                                              |
| **response** | `SearchResponse`               | Response to last query. Contains only last page of hits retrieved. Initially `null`. See https://www.algolia.com/doc/api-reference/api-methods/search/#response |
| **loading**  | `boolean`                      | True if a request is being loaded, either to load initial request or when loading more hits.                                                                    |
| **hasMore**  | `boolean`                      | True if there are more pages to be retrieved.                                                                                                                   |

---

## Credits

Based on the original hook by [@shamsmosowi](https://github.com/shamsmosowi).

Bootstrapped with [tsdx](https://github.com/jaredpalmer/tsdx) and published with
[np](https://github.com/sindresorhus/np).

useAlgolia is created by [Antler Engineering](https://twitter.com/AntlerEng).

[![Firetable](assets/firetable.svg)](https://firetable.io)

Also check out our open-source project [Firetable](https://firetable.io): an
accessible and powerful content management experience for Google Cloud with a
spreadsheet-like UI for Firestore.

## About Antler

At [Antler](https://antler.co), we identify and invest in exceptional people.

We’re a global startup generator and early-stage VC firm that builds
groundbreaking technology companies.

[Apply now](https://antler.co/apply) to be part of a global cohort of tech
founders.
