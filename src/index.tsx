import { useReducer, useMemo, useCallback, useEffect } from 'react';
import algoliasearch from 'algoliasearch/lite';
import { RequestOptions } from '@algolia/transporter';
import { SearchOptions, SearchResponse } from '@algolia/client-search';

/**
 * Creates the Algolia search client and initialises the specified index.
 * @param appId Algolia app ID
 * @param searchKey API key to search this index
 * @param indexName Index to initialise
 */
export const createAlgoliaIndex = (
  appId: string,
  searchKey: string,
  indexName: string
) => algoliasearch(appId, searchKey).initIndex(indexName);

/** Current request state, hits retrieved, and loading status. */
interface SearchState {
  /** Algolia SearchResponse object — contains only last page of hits retrieved */
  response: SearchResponse<any> | null;
  /** Contains all hits for search query, including all pages retrieved */
  hits: SearchResponse<any>['hits'];
  /** Set when loading initially or loading more hits */
  loading: boolean;
  /** Flag set if there are more pages to be retrieved */
  hasMore: boolean;
}

/**
 * Updates hook’s internal `SearchState`. Handles:
 * - Checking if there are more pages that can be retrieved
 * - Concatenating hits if we queried a new page
 * @param prevState See `SearchState` interface
 * @param updates Updates to `SearchState`
 */
const searchReducer = (
  prevState: SearchState,
  updates: Partial<SearchState>
) => {
  const gotMore = updates?.response?.page && updates?.response?.page > 0;

  const hits =
    gotMore && updates.response
      ? [...prevState.hits, ...updates.response.hits]
      : // If we’re not getting results from a new page, `hits` is set to:
        // 1. overwrite `hits` from `updates` (when resetting query),
        // 2. use the latest `hits` from the response,
        // 3. use `hits` from the previous state, or
        // 4. an empty array
        updates.hits ?? updates.response?.hits ?? prevState.hits ?? [];

  const hasMore = updates.response
    ? updates.response.page < updates.response.nbPages - 1
    : false;

  return { ...prevState, ...updates, hits, hasMore };
};

/**
 * Hook to make Algolia search queries with built-in support for pagination.
 * @param appId Algolia app ID
 * @param searchKey API key to search the index
 * @param indexName Algolia index to query
 * @param initialRequest Initial `SearchOptions` object sent to Algolia request
 * @returns The following array:
 *   1. `searchState`: containing `hits` and `loading`,
 *   2. `requestDispatch` to update `SearchOptions` passed to Algolia — see
 *      https://www.algolia.com/doc/api-reference/search-api-parameters/, and
 *   3. `getMore` to get the next page of results
 */
export function useAlgolia(
  appId: string,
  searchKey: string,
  indexName: string,
  initialRequest: RequestOptions & SearchOptions = {}
) {
  // Stores response status
  const [searchState, searchDispatch] = useReducer(searchReducer, {
    response: null,
    hits: [],
    loading: false,
    hasMore: false,
  });

  // Store the `SearchOptions` request object that can shallow-merge updates
  const [request, requestDispatch] = useReducer(
    (
      prev: RequestOptions & SearchOptions,
      updates: RequestOptions & SearchOptions
    ) => ({ ...prev, ...updates }),
    initialRequest
  );

  // Get Algolia index — only created for each `appId`, `indexName`, and `searchKey`
  const index = useMemo(() => createAlgoliaIndex(appId, searchKey, indexName), [
    appId,
    searchKey,
    indexName,
  ]);

  // Query algolia with search text + filters
  // Function will be recreated when `SearchOptions` request object changes
  const query = useCallback(
    async (page = 0) => {
      if (page > 0) searchDispatch({ loading: true });
      // If we’re not getting a new page, reset the hits
      else searchDispatch({ loading: true, hits: [] });

      const response = await index.search<any>('', {
        page,
        ...request,
      });

      searchDispatch({ response, loading: false });
    },
    [index, request]
  );

  // Get completely new query when `query` function is recreated above
  useEffect(() => {
    query();
  }, [query]);

  // Get more by incrementing the page. Does nothing if we’re still waiting
  // on new results to arrive or if there are no more pages to be loaded
  const getMore = () => {
    if (searchState.response && !searchState.loading && searchState.hasMore)
      query(searchState.response.page + 1);
  };

  return [searchState, requestDispatch, getMore] as [
    typeof searchState,
    typeof requestDispatch,
    typeof getMore
  ];
}

export default useAlgolia;
