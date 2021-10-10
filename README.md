# useAlgolia [![npm latest release](https://badgen.net/npm/v/use-algolia)](https://www.npmjs.com/use-algolia) [![Minified size](https://badgen.net/bundlephobia/min/use-algolia)](https://bundlephobia.com/result?p=use-algolia)

Dead-simple React hook to make Algolia search queries. Supports pagination out
of the box.

![Code snippet](https://raw.githubusercontent.com/AntlerVC/use-algolia/master/assets/carbon.png)

## Installation

Requires [React](https://www.npmjs.com/react) >= 16.8.0 and
[algoliasearch](https://www.npmjs.com/algoliasearch) 4.

```
yarn add react algoliasearch use-algolia
```

## Usage

Pass the Algolia app ID, search API key, and index name to the hook call.

If you don’t have one of the three on the first hook call, pass in an empty
string first.
[See the example below.](#changing-query-index-or-other-algolia-config)

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

### Changing query index or other Algolia config

When the `appId`, `searchKey`, or `indexName` passed to the hook call updates,
the index is reinitialised with the new config.

You can also use the `setAlgoliaConfig` function returned by the hook:

```ts
const [, , , setAlgoliaConfig] = useAlgolia('', '', '');

setAlgoliaConfig({
  appId: APP_ID,
  searchKey: SEARCH_KEY,
  indexName: INDEX_NAME,
});
```

Doing either will automatically do the first query on the new index if all three
items are provided.

### Searching for facet values

You can access the search index created by the hook in `searchState` to call the
`searchForFacetValues` method. See
https://www.algolia.com/doc/api-reference/api-methods/search-for-facet-values/

Note: `index` may be `null` if one of `appId`, `searchKey`, or `indexName` is
missing or invalid in `searchState`.
[See Changing query index or other Algolia config above.](#changing-query-index-or-other-algolia-config)

```js
const [searchState] = useAlgolia('', '', '');
const { index } = searchState;

if (index) index.searchForFacetValues('city');
```

## State

| Key           | Type                           | Description                                                                                                                                                                                                                                                                        |
| ------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **hits**      | `(Hit & ObjectWithObjectID)[]` | Contains all hits for search query, including all pages retrieved.                                                                                                                                                                                                                 |
| **response**  | `SearchResponse` or `null`     | Response to last query. Contains only last page of hits retrieved. Initially `null`. See https://www.algolia.com/doc/api-reference/api-methods/search/#response                                                                                                                    |
| **loading**   | `boolean`                      | True if a request is being loaded, either to load initial request or when loading more hits.                                                                                                                                                                                       |
| **hasMore**   | `boolean`                      | True if there are more pages to be retrieved.                                                                                                                                                                                                                                      |
| **appId**     | `string`                       | Algolia App ID.                                                                                                                                                                                                                                                                    |
| **searchKey** | `string`                       | API key to search the index.                                                                                                                                                                                                                                                       |
| **indexName** | `string`                       | Algolia index to query.                                                                                                                                                                                                                                                            |
| **index**     | `SearchIndex` or `null`        | Exposed Algolia search index. Note we use the lite client, which only supports the [`search`](https://www.algolia.com/doc/api-reference/api-methods/search/) and [`searchForFacetValues`](https://www.algolia.com/doc/api-reference/api-methods/search-for-facet-values/) methods. |
| **request**   | `SearchOptions`                | Exposed search request options passed to the last request. [From previous `requestDispatch` calls.](#making-new-requests)                                                                                                                                                          |

---

## Credits

Based on the original hook by [@shamsmosowi](https://github.com/shamsmosowi).

Bootstrapped with [tsdx](https://github.com/jaredpalmer/tsdx) and published with
[np](https://github.com/sindresorhus/np).
