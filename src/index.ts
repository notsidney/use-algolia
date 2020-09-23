import { useReducer, useCallback, useEffect } from 'react';
import algoliasearch, { SearchIndex } from 'algoliasearch';
import { RequestOptions } from '@algolia/transporter';
import { SearchOptions, SearchResponse } from '@algolia/client-search';

/**
 * Creates the Algolia search client and initialises the specified index.
 * @param appId Algolia app ID
 * @param searchKey API key to search this index
 * @param indexName Index to initialise
 */
export const createAlgoliaIndex = (
  appId?: string,
  searchKey?: string,
  indexName?: string
) => {
  if (!appId || !searchKey || !indexName) return null;
  return algoliasearch(appId, searchKey).initIndex(indexName);
};

/** Current request state, hits retrieved, and loading status. */
interface SearchState<Hit> {
  /** Algolia SearchResponse object — contains only last page of hits retrieved */
  response: SearchResponse<Hit> | null;
  /** Contains all hits for search query, including all pages retrieved */
  hits: SearchResponse<Hit>['hits'];
  /** Set when loading initially or loading more hits */
  loading: boolean;
  /** Flag set if there are more pages to be retrieved */
  hasMore: boolean;
  /** Algolia App ID */
  appId: string;
  /** API key to search the index */
  searchKey: string;
  /** Algolia index to query */
  indexName: string;
  /** The Algolia search index created */
  index: SearchIndex | null;
}

/**
 * Updates hook’s internal `SearchState`. Handles:
 * - Checking if there are more pages that can be retrieved
 * - Concatenating hits if we queried a new page
 * @param prevState See `SearchState` interface
 * @param updates Updates to `SearchState`
 */
const generateSearchReducer = <Hit>() => (
  prevState: SearchState<Hit>,
  updates: Partial<SearchState<Hit>>
): SearchState<Hit> => {
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
 *   4. `setAlgoliaConfig` to update the Algolia index to use
 */
export function useAlgolia<Hit = any>(
  appId: string,
  searchKey: string,
  indexName: string,
  initialRequest: RequestOptions & SearchOptions = {}
) {
  // Stores response status
  const [searchState, searchDispatch] = useReducer(
    generateSearchReducer<Hit>(),
    {
      response: null,
      hits: [],
      loading: false,
      hasMore: false,
      appId,
      searchKey,
      indexName,
      index: createAlgoliaIndex(appId, searchKey, indexName),
    }
  );
  const { index } = searchState;

  // Store the `SearchOptions` request object that can shallow-merge updates
  const [request, requestDispatch] = useReducer(
    (
      prev: RequestOptions & SearchOptions,
      updates: RequestOptions & SearchOptions
    ) => ({ ...prev, ...updates }),
    initialRequest
  );

  // Query algolia with search text + filters
  // Function will be recreated when `SearchOptions` request object changes
  const query = useCallback(
    async (page?: number) => {
      if (!index) return;

      // Set loading
      if (typeof page === 'number' && page > 0)
        searchDispatch({ loading: true });
      // If we’re not getting a new page, reset the hits
      else searchDispatch({ loading: true, hits: [] });

      const response = await index.search<Hit>('', {
        ...request,
        // Allow getMore() to work even if the user
        // has set page in requestDispatch
        page: page ?? request.page ?? 0,
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

  // Updates Algolia config and creates a new index, then updates state
  const setAlgoliaConfig = (
    newConfig: Partial<
      Pick<SearchState<Hit>, 'appId' | 'searchKey' | 'indexName'>
    >
  ) => {
    const updates: Partial<SearchState<Hit>> = {};
    // Only pass updated config items that are not undefined
    if (newConfig.appId) updates.appId = newConfig.appId;
    if (newConfig.searchKey) updates.searchKey = newConfig.searchKey;
    if (newConfig.indexName) updates.indexName = newConfig.indexName;

    // Generate new index with latest data
    updates.index = createAlgoliaIndex(
      updates.appId ?? searchState.appId,
      updates.searchKey ?? searchState.searchKey,
      updates.indexName ?? searchState.indexName
    );

    searchDispatch(updates);
  };
  // Update config when main useAlgolia props update
  useEffect(() => {
    setAlgoliaConfig({ appId, searchKey, indexName });
  }, [appId, searchKey, indexName]);

  return [
    { ...searchState, request },
    requestDispatch,
    getMore,
    setAlgoliaConfig,
  ] as [
    typeof searchState & { request: typeof request },
    typeof requestDispatch,
    typeof getMore,
    typeof setAlgoliaConfig
  ];
}

export default useAlgolia;
