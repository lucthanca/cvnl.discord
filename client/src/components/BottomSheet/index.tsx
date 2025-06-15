import { forwardRef, useImperativeHandle, PropsWithChildren, useRef } from 'react';
import { motion, useSpring, PanInfo, useMotionValue } from 'framer-motion';
import './index.style.scss';

const OFFSET_THRESHOLD = 300;        // nếu kéo quá 200px thì chuyển
const VELOCITY_THRESHOLD = 1000;

const percentToPx = (percentStr: string) => {
  const value = parseFloat(percentStr);
  return (value / 100) * window.innerHeight;
};
const findClosest = (value: number, array: number[]) => {
  return array.reduce((prev, curr) =>
    Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev
  );
}

export type IOSBottomSheetHandle = {
  snapTo: (index: number) => void;
  closeSheet: () => void;
};

type Props = {
  onClose?: () => void;
}
const iOSBottomSheet = forwardRef<IOSBottomSheetHandle, PropsWithChildren<Props>>((props, ref) =>{
  const snapPoints = ['15%', '45%', '70%', '100%'];
  const snapPointsPx = snapPoints.map(percentToPx);

  const rootRef = useRef<HTMLDivElement>(null);
  const y = useSpring(snapPointsPx[3], {
    stiffness: 200,  // độ cứng, cao thì kéo thả nhạy hơn
    damping: 20,     // giảm dao động, càng cao thì càng ít "bật"
    mass: 1,       // khối lượng, nhỏ thì nhẹ và nhạy hơn
  });
  const maxSheetHeight = useMotionValue(window.innerHeight - snapPointsPx[2]);

  const snapTo = (index: number) => {
    if (index < 0 || index >= snapPointsPx.length) return; // Kiểm tra chỉ số hợp lệ
    y.set(snapPointsPx[index]);
    const isVisible = index !== 3;
    rootRef?.current?.setAttribute('area-visible', isVisible.toString());
  };

  const closeSheet = () => {
    snapTo(3); // xuống đáy = đóng
  };

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    // console.log('Drag ended:', { event, info });
    // console.log('info: ' + JSON.stringify(info));
    const { offset, velocity, point } = info;
    const offsetY = offset.y;
    const velocityY = velocity.y;
    const currentIndex = snapPointsPx.findIndex(
      (p) => p === findClosest(point.y, snapPointsPx)
    );
    let targetIndex = currentIndex;

    // Nếu vuốt nhanh xuống hoặc kéo quá xa → xuống dưới
    if (velocityY > VELOCITY_THRESHOLD || offsetY > OFFSET_THRESHOLD) {
      targetIndex = Math.min(currentIndex + 1, snapPointsPx.length - 1);
    }
    // Nếu vuốt nhanh lên hoặc kéo lên cao → lên trên
    else if (velocityY < -VELOCITY_THRESHOLD || offsetY < -OFFSET_THRESHOLD) {
      targetIndex = Math.max(currentIndex - 1, 0);
    }

    // console.log('Target index:', targetIndex);

    snapTo(targetIndex);
    targetIndex < 3 && maxSheetHeight.set(window.innerHeight - snapPointsPx[targetIndex]);
  }
  const handleDragStart = () => {
    maxSheetHeight.set(window.innerHeight);
  };

  useImperativeHandle(ref, () => {
    return {
      snapTo,
      closeSheet,
    };
  }, [snapTo]);
  return (
    <>
      <motion.div
        ref={rootRef}
        className="sheet__root flex flex-col overflow-hidden fixed top-0 left-0 w-full h-screen bg-white rounded-t-2xl shadow-xl z-[999]"
        style={{
          translateY: y,
          height: maxSheetHeight,
        }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.5}
        dragMomentum={false}
        onDragEnd={handleDragEnd}
        onDragStart={handleDragStart}
      >
        <motion.div className="w-full flex justify-center py-3 cursor-grab active:cursor-grabbing shrink-0">
          <div className="w-12 h-1.5 bg-gray-400 rounded-full hover:bg-gray-500 transition-colors" />
        </motion.div>

        {/* Nội dung */}
        {props.children}
      </motion.div>
    </>
  );
});

export default iOSBottomSheet;
