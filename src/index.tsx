import { useReducer, useMemo, useCallback, useEffect } from 'react';
import algoliasearch from 'algoliasearch/lite';
import { SearchOptions, SearchResponse } from '@algolia/client-search';

/**
 * Creates the Algolia search client and initialises the specified index.
 * @param indexName Index to initialise
 * @param searchKey API key to search this index
 */
export const createAlgoliaIndex = (indexName: string, searchKey: string) =>
  algoliasearch(process.env.REACT_APP_ALGOLIA_APP_ID!, searchKey).initIndex(
    indexName
  );

interface SearchState {
  /** Search query text used in Algolia call */
  search: NonNullable<SearchOptions['query']>;
  /** Facet filters. See https://www.algolia.com/doc/api-reference/api-parameters/facetFilters/ */
  filters: SearchOptions['facetFilters'];
  /** Algolia search response object — contains one page of hits at a time */
  result: SearchResponse<any> | null;
  /** Contains all hits when more results are called */
  hits: SearchResponse<any>['hits'];
  /** Set when loading initially or loading more hits */
  loading: boolean;
  /** Flag set if there are more pages to be retrieved */
  hasMore: boolean;
}

interface SearchAction extends Partial<SearchState> {
  type?: 'MORE_HITS' | '';
}

/**
 * Search reducer to shallow-merge updates to state. Also handles checking if
 * there are more pages that can be queried and concatenating hits when more
 * hits are received.
 * @param prevState See SearchState interface
 * @param action Contains updates to state. Use type: 'MORE_HITS' to concatenate hits
 */
const searchReducer = (prevState: SearchState, action: SearchAction) => {
  const { type, ...updates } = action;

  const hits =
    type === 'MORE_HITS' && updates.result
      ? [...prevState.hits, ...updates.result.hits]
      : updates.hits ?? updates.result?.hits ?? prevState.hits ?? [];

  const hasMore = updates.result
    ? updates.result.page < updates.result.nbPages - 1
    : false;

  return { ...prevState, ...updates, hasMore, hits };
};

/**
 * Hook to make Algolia queries with search term, facet filters, and pagination.
 * @param indexName Algolia index to query
 * @param searchKey API key to search the index
 * @param initialState Initial state for search query and filters
 * @returns The following array:
 *   1. `searchState` (containing `hits` and `loading`),
 *   2. `searchDispatch` (to update `search` and `filters` in state), and
 *   3. `getMore` to get the next page of results
 */
export default function useAlgolia(
  indexName: string,
  searchKey: string,
  initialState?: Pick<SearchState, 'search' | 'filters'>
) {
  const [searchState, searchDispatch] = useReducer(searchReducer, {
    search: '',
    filters: [],
    ...initialState,
    result: null,
    hits: [],
    loading: false,
    hasMore: false,
  });

  // Get Algolia index — only created for each indexName and searchKey
  const index = useMemo(() => createAlgoliaIndex(indexName, searchKey), [
    indexName,
    searchKey,
  ]);

  // Query algolia with search text + filters
  const query = useCallback(
    async (page = 0) => {
      const getMore = page > 0;

      if (getMore) searchDispatch({ loading: true });
      else searchDispatch({ loading: true, hits: [] });

      const result = await index.search<any>(searchState.search, {
        page,
        facetFilters: searchState.filters,
      });

      searchDispatch({
        result,
        type: page > 0 ? 'MORE_HITS' : '',
        loading: false,
      });
    },
    [index, searchState.filters, searchState.search]
  );

  // Get completely new query when search or filters change (reset page)
  useEffect(() => {
    query();
  }, [index, query]);

  const getMore = () => {
    if (searchState.result && !searchState.loading && searchState.hasMore)
      query(searchState.result.page + 1);
  };

  return [searchState, searchDispatch, getMore] as [
    typeof searchState,
    typeof searchDispatch,
    typeof getMore
  ];
}
