import React, { memo, useState, useEffect, useCallback, useRef } from 'react';
import './GifPicker.style.scss'; // Import your CSS styles for the GIF grid
import { callTenorApi, TenorParams } from '~/services/tenorApi';
import { debounce } from 'lodash';
import TextBox, { TextBoxApi } from '~/components/DebounceTextBox';
import { GifSelectHandler, TenorGIF } from '~/components/Chat/MessageInput/EmojiPicker/GifGrid';
import { useIntersection } from '~/hooks/useIntersection.js';
const GifGrid = React.lazy(() => import('./GifGrid'));

type Props = {
  onGifSelect?: (gifUrl: string) => void;
}

type Category = {
  image: string;
  name: string;
  path: string;
  searchterm: string;
};

const useTenorGif = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      const categories = await callTenorApi('categories', {} , {
        signal: controller.signal,
      });
      setCategories(categories['tags']);
    })();
    return () => {
      controller.abort();
    };
  }, []);

  return {
    categories,
  };
};

type TenorSearchResponse = {
  results: TenorGIF[];
  next?: string;
}
const GifPicker: React.FC<Props> = ({ onGifSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const searchBoxRef = useRef<TextBoxApi>(null);
  const searchGif = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);
  const stRef = useRef(searchGif);
  const nextRef = useRef('');
  const { ref, entry } = useIntersection({ threshold: 1 });
  const [gifs, setGifs] = useState<TenorGIF[]>([]);
  const { categories } = useTenorGif();

  const onSearchTermChange = useCallback(debounce((value: string) => {
    stRef.current?.(value);
  }, 500), []);

  const queryTenorGif = useCallback((q: string, opts: { controller: AbortController }, next?: string) => {
    const params: TenorParams = {
      q,
      client_key: 'chat-thinhthom-app',
      limit: 50,
      media_filter: 'tinygif,gif,mp4,tinymp4',
    };
    if (next) {
      params.pos = next;
    }
    return callTenorApi<TenorSearchResponse>('search', params, {
      signal: opts.controller.signal,
    });
  }, []);

  useEffect(() => {
    console.log('Intersection entry:', entry);
    if (!entry?.isIntersecting || nextRef.current.trim() === '' || searchTerm.trim() === '') return;

    const controller = new AbortController();
    (async () => {
      const res = await queryTenorGif(searchTerm, { controller }, nextRef.current);
      setGifs(prev => {
        if (res.results.length === 0) return prev;
        return [...prev, ...res.results];
      });
      nextRef.current = res.next || '';
    })();
  }, [entry, entry?.isIntersecting]);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setGifs([]);
      nextRef.current = '';
      return;
    }
    const controller = new AbortController();

    (async () => {
      const res = await queryTenorGif(searchTerm, {
        controller,
      });
      setGifs(res.results);
      nextRef.current = res.next || '';
    })();
  }, [searchTerm]);

  const handleGifClick: GifSelectHandler = (gif) => {
    onGifSelect?.(gif.url);
  };
  const onCategoryClick = (category: Category) => {
    setSearchTerm(category.searchterm);
    searchBoxRef.current?.setValue(category.searchterm);
  }

  return (
    <div className="gif__wrapper flex flex-col items-stretch gap-4 overflow-hidden mx-2 select-none">
      {/* Search Input */}
      <div className="gif__search relative shrink-0 mx-2">
        <TextBox
          ref={searchBoxRef}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
          onChange={onSearchTermChange}
          placeholder="Tìm kiếm GIF..."
        />
      </div>

      {/* GIF Category Grid */}
      {searchTerm.trim() === '' && (
        <div className='gif-category__grid grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 grid-flow-row overflow-y-auto gap-4 px-2'>
          {categories.map((category) => (
            <div
              key={category.name}
              className="gif-category__item flex flex-col items-center cursor-pointer aspect-video relative rounded-lg overflow-clip"
              onClick={onCategoryClick.bind(null, category)}
            >
              <div className='__overlay absolute top-0 left-0 w-full h-full' style={{ backgroundColor: 'color-mix(in oklab,hsl(228 calc(1*6.849%) 14.314% /0.75) 100%,hsl(0 0% 0% /0.75) 0%)'}}></div>
              <span className="absolute text-white top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-bold" style={{ textShadow: '0 1px 1px rgba(0,0,0,.6)' }}>{category.name}</span>
              <img src={category.image} alt={category.name} className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      )}
      {(gifs.length > 0 && searchTerm.trim()) !== '' && (
        <React.Suspense fallback={(
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        )}>
          <GifGrid onGifSelect={handleGifClick} items={gifs} lastElementRef={ref} />
        </React.Suspense>
      )}
    </div>
  );
};

export default memo(GifPicker);