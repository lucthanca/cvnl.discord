import React from 'react';
import Masonry from 'react-masonry-css';
import { AnimatePresence, motion } from 'framer-motion';

export type GIFMediaType = {
  dims: [number, number];
  duration: number;
  preview: string;
  size: number;
  url: string;
};

export type ValidFormat = 'gif' | 'mp4' | 'tinygif' | 'tinymp4'

export type TenorGIF = {
  title: string;
  url: string;
  tags: string[];
  itemurl: string;
  id: string;
  hasaudio: boolean;
  flags: string[];
  created: number;
  content_description_source: string;
  content_description: string;
  media_formats: Record<ValidFormat, GIFMediaType>;
};

export type GifSelectHandler = (gif: TenorGIF) => void;

type Props = {
  items: TenorGIF[];
  onGifSelect?: GifSelectHandler;
  lastElementRef?: (node: HTMLDivElement | null) => void;
};

const breakpointColumnsObj = {
  default: 4,
  960: 3,
  640: 2,
  280: 1,
};
const GifGrid: React.FC<Props> = (props) => {
  const { items, onGifSelect } = props;
  console.log({ items });
  // fade and slide up and scale animation for each gif item
  const animateVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.9 },
    visible: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -20, scale: 0.85 },
  }
  if (items.length === 0) return null;
  return (
    <AnimatePresence>
      <Masonry
        breakpointCols={breakpointColumnsObj}
        columnClassName="my-masonry-grid_column"
        className="gif__grid my-masonry-grid overflow-y-auto px-2">
        {items.map((gif, index) => (
          <motion.div
            key={gif.id}
            onClick={onGifSelect?.bind?.(null, gif)}
            className='gif__item overflow-hidden rounded-lg cursor-pointer'
            layout
            variants={animateVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            ref={index === items.length - 1 ? props.lastElementRef : undefined}
          >
            {gif.media_formats.tinymp4?.url && (
              <video autoPlay loop muted playsInline src={gif.media_formats.tinymp4?.url} />
            )}
            {!gif.media_formats.tinymp4?.url && (
              <img src={gif.media_formats.tinygif?.url || gif.media_formats.gif?.url} alt={gif.title} loading="lazy" />
            )}
          </motion.div>
        ))}
      </Masonry>
    </AnimatePresence>
  );
};

export default React.memo(GifGrid);
