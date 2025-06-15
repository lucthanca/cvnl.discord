export default (props: { width: number | string; height: number | string, backgroundColor?: string, className?: string }) => {
  const { width, height, backgroundColor = "#fff" } = props;
  return (
    <svg width={width} height={height} fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="2 2 20 20" className={props.className}>
      <g
        id="SVGRepo_bgCarrier"
        stroke-width="0"
        transform="translate(4.199999999999999,4.199999999999999), scale(0.65)"
      >
        
        <rect
          x="-2.4"
          y="-2.4"
          width="28.80"
          height="28.80"
          rx="11.52"
          fill={backgroundColor}
          strokewidth="0"
        ></rect>
      </g>
      <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
      <g id="SVGRepo_iconCarrier">
        
        <g id="Iconly/Curved/Close Square">
          
          <g id="Close Square">
            
            <path
              id="Stroke 1"
              d="M14.3941 9.59473L9.60205 14.3867"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            ></path>
            <path
              id="Stroke 2"
              d="M14.3999 14.393L9.59985 9.59302"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            ></path>
            <path
              id="Stroke 3"
              fill-rule="evenodd"
              clip-rule="evenodd"
              d="M2.75 12C2.75 18.937 5.063 21.25 12 21.25C18.937 21.25 21.25 18.937 21.25 12C21.25 5.063 18.937 2.75 12 2.75C5.063 2.75 2.75 5.063 2.75 12Z"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            ></path>
          </g>
        </g>
      </g>
    </svg>
  );
};
