import React, { useEffect, useRef } from 'react';
import { Picker } from 'emoji-mart';

export default function EmojiPicker(props: any) {
  const ref = useRef(null)
  const instance = useRef<Picker>(null)

  if (instance.current) {
    instance.current.update(props)
  }

  useEffect(() => {
    instance.current = new Picker({ ...props, ref })

    return () => {
      instance.current = null
    }
  }, [])

  return React.createElement('div', { ref })
}