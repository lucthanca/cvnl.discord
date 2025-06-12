import { useState, useEffect } from "react";
import { motion, useMotionValue, animate } from "framer-motion";

export default function IOSBottomSheet() {
  const [open, setOpen] = useState(false);
  const y = useMotionValue(0);
  const snapPoints = [100, 300, window.innerHeight * 0.95]; // Top, Mid, Hidden
  const [currentSnap, setCurrentSnap] = useState<number | null>(null);

  // Init vị trí ẩn (chìm dưới đáy)
  useEffect(() => {
    y.set(snapPoints[2]);
  }, []);

  const snapTo = (index: number) => {
    animate(y, snapPoints[index], { type: "spring", stiffness: 300, damping: 35 });
    setCurrentSnap(index);
  };

  const handleDragEnd = (_: any, info: { offset: { y: number }; velocity: { y: number } }) => {
    if (currentSnap === null) return;

    const dir = info.velocity.y > 0 ? 1 : -1;
    let nextSnap = currentSnap + dir;

    if (Math.abs(info.offset.y) < 50) nextSnap = currentSnap;

    nextSnap = Math.max(0, Math.min(snapPoints.length - 1, nextSnap));
    snapTo(nextSnap);
  };

  const openSheet = () => {
    setOpen(true);
    snapTo(1); // mở ở nửa màn hình
  };

  const closeSheet = () => {
    snapTo(2); // xuống đáy = đóng
    setTimeout(() => setOpen(false), 300); // delay unmount
  };

  return (
          <>
            <button
                    onClick={openSheet}
                    className="fixed bottom-10 left-1/2 -translate-x-1/2 px-4 py-2 bg-blue-600 text-white rounded-full shadow-lg z-50"
            >
              Open Bottom Sheet
            </button>

            {open && (
                    <motion.div
                            className="fixed top-0 left-0 w-full h-screen bg-white rounded-t-2xl shadow-xl z-[999]"
                            style={{ translateY: y }}
                            drag="y"
                            dragConstraints={{ top: snapPoints[0], bottom: snapPoints[2] }}
                            onDragEnd={handleDragEnd}
                    >
                      {/* Drag handle */}
                      <div
                              className="w-full flex justify-center py-3 cursor-pointer"
                              onClick={() => {
                                if (currentSnap === null) return;
                                snapTo(currentSnap === 2 ? 1 : 2); // toggle full <-> half
                              }}
                      >
                        <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
                      </div>

                      {/* Nội dung */}
                      <div className="px-4 pb-10">
                        <div className="flex justify-between items-center mb-4">
                          <h2 className="text-xl font-bold">🍎 iOS Bottom Sheet</h2>
                          <button
                                  onClick={closeSheet}
                                  className="text-gray-500 text-sm underline"
                          >
                            Close
                          </button>
                        </div>
                        <p className="text-gray-600">
                          Vuốt nhẹ là mở nửa màn hình. Vuốt mạnh bung nóc. Vuốt xuống là tạm biệt 👋
                        </p>
                      </div>
                    </motion.div>
            )}
          </>
  );
}
