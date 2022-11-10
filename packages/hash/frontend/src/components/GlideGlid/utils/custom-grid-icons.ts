import type { SpriteProps } from "@glideapps/glide-data-grid/dist/ts/common/utils";
import type { CustomIcon } from "@glideapps/glide-data-grid/dist/ts/data-grid/data-grid-sprites";

export const customGridIcons: Record<
  CustomIcon,
  (props: SpriteProps) => string
> = {
  bpAsteriskCircle: ({ fgColor }) =>
    `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7 0C3.11719 0 0 3.14453 0 7C0 10.8828 3.11719 14 7 14C10.8555 14 14 10.8828 14 7C14 3.14453 10.8555 0 7 0ZM7 12.6875C3.85547 12.6875 1.3125 10.1445 1.3125 7C1.3125 3.88281 3.85547 1.3125 7 1.3125C10.1172 1.3125 12.6875 3.88281 12.6875 7C12.6875 10.1445 10.1172 12.6875 7 12.6875Z" fill="${fgColor}"/><path d="M10.0156 8.75C9.92188 8.92188 9.75 9 9.57812 9C9.48438 9 9.40625 8.98438 9.32812 8.9375L7.5 7.875V10C7.5 10.2812 7.26562 10.5 7 10.5C6.75 10.5 6.5 10.2812 6.5 10V7.875L4.64062 8.9375C4.5625 8.98438 4.48438 9 4.39062 9C4.21875 9 4.04688 8.92188 3.96875 8.75C3.82812 8.51562 3.90625 8.21875 4.14062 8.07812L5.98438 7L4.14062 5.9375C3.90625 5.79688 3.82812 5.5 3.95312 5.25C4.0625 5.07812 4.26562 4.98438 4.45312 5.01562C4.51562 5.01562 4.57812 5.04688 4.64062 5.07812L6.5 6.14062V4C6.5 3.73438 6.71875 3.5 7 3.5C7.26562 3.5 7.5 3.73438 7.5 4V6.14062L9.34375 5.07812C9.40625 5.04688 9.46875 5.01562 9.53125 5.01562C9.71875 4.98438 9.92188 5.07812 10.0156 5.25C10.1406 5.5 10.0625 5.79688 9.82812 5.9375L8 7L9.84375 8.07812C10.0781 8.21875 10.1562 8.51562 10.0156 8.75Z" fill="${fgColor}"/></svg>`,
  bpError: () =>
    `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7 0C3.11719 0 0 3.14453 0 7C0 10.8828 3.11719 14 7 14C10.8555 14 14 10.8828 14 7C14 3.14453 10.8555 0 7 0ZM7 12.6875C3.85547 12.6875 1.3125 10.1445 1.3125 7C1.3125 3.88281 3.85547 1.3125 7 1.3125C10.1172 1.3125 12.6875 3.88281 12.6875 7C12.6875 10.1445 10.1172 12.6875 7 12.6875ZM7 8.3125C7.35547 8.3125 7.65625 8.03906 7.65625 7.65625V4.15625C7.65625 3.80078 7.35547 3.5 7 3.5C6.61719 3.5 6.34375 3.80078 6.34375 4.15625V7.65625C6.34375 8.03906 6.61719 8.3125 7 8.3125ZM7 9.24219C6.50781 9.24219 6.125 9.625 6.125 10.0898C6.125 10.5547 6.50781 10.9375 7 10.9375C7.46484 10.9375 7.84766 10.5547 7.84766 10.0898C7.84766 9.625 7.46484 9.24219 7 9.24219Z" fill="#DF3449"/></svg>`,
  bpLabel: ({ fgColor }) =>
    `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7 0C3.11719 0 0 3.14453 0 7C0 10.8828 3.11719 14 7 14C10.8555 14 14 10.8828 14 7C14 3.14453 10.8555 0 7 0ZM7 12.6875C3.85547 12.6875 1.3125 10.1445 1.3125 7C1.3125 3.88281 3.85547 1.3125 7 1.3125C10.1172 1.3125 12.6875 3.88281 12.6875 7C12.6875 10.1445 10.1172 12.6875 7 12.6875Z" fill="${fgColor}"/><path d="M4.5 3.5H6.82812C7.09375 3.5 7.34375 3.60938 7.53125 3.79688L10.2812 6.54688C10.6719 6.9375 10.6719 7.57812 10.2812 7.96875L8.20312 10.0469C7.8125 10.4375 7.17188 10.4375 6.78125 10.0469L4.03125 7.29688C3.84375 7.10938 3.75 6.85938 3.75 6.59375V4.25C3.75 3.84375 4.07812 3.5 4.5 3.5ZM5.5 5.75C5.76562 5.75 6 5.53125 6 5.25C6 4.98438 5.76562 4.75 5.5 4.75C5.21875 4.75 5 4.98438 5 5.25C5 5.53125 5.21875 5.75 5.5 5.75Z" fill="${fgColor}"/></svg>`,
  bpAsterisk: ({ fgColor }) =>
    `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14.9882 12C14.7762 12.3668 14.3922 12.5714 13.9972 12.5714C13.8035 12.5714 13.6072 12.5223 13.4268 12.4185L9.23466 9.97857V14.8571C9.23466 15.4882 8.72288 16 8.12395 16C7.52502 16 6.94895 15.4893 6.94895 14.8571V9.97857L2.72395 12.4175C2.54431 12.5214 2.34788 12.5714 2.15431 12.5714C1.75931 12.5714 1.37538 12.3666 1.16323 12C0.847949 11.4532 1.03488 10.7543 1.58181 10.4386L5.77395 8L1.58181 5.56071C1.03502 5.24643 0.847878 4.54643 1.13109 4C1.40002 3.58929 1.85109 3.38214 2.29359 3.43571C2.44109 3.45357 2.58752 3.50357 2.72466 3.58214L6.94895 6.02143V1.14286C6.94895 0.511786 7.46074 0 8.09181 0C8.72288 0 9.23466 0.511786 9.23466 1.14286V6.02143L13.4597 3.5825C13.5967 3.50346 13.7432 3.45611 13.8907 3.43782C14.3311 3.38214 14.7847 3.58929 14.9882 4C15.3035 4.54679 15.1166 5.24571 14.5697 5.56143L10.3775 8L14.6025 10.4386C15.1489 10.7536 15.3347 11.4536 14.9882 12Z" fill="${fgColor}"/></svg>`,
  bpChevronDown: ({ fgColor }) =>
    `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><g clip-path="url(#clip0_1_8)"><path fill-rule="evenodd" clip-rule="evenodd" d="M15.7243 4.27748C16.0919 4.64745 16.0919 5.24729 15.7243 5.61726L8.66551 12.7225C8.29796 13.0925 7.70204 13.0925 7.33449 12.7225L0.275663 5.61726C-0.0918894 5.24729 -0.0918894 4.64745 0.275663 4.27748C0.643215 3.90751 1.23914 3.90751 1.60669 4.27748L8 10.7129L14.3933 4.27748C14.7609 3.90751 15.3568 3.90751 15.7243 4.27748Z" fill="${fgColor}"/></g><defs><clipPath id="clip0_1_8"><rect width="16" height="16" fill="white" transform="translate(16) rotate(90)"/></clipPath></defs></svg>`,
  bpChevronRight: ({ fgColor }) =>
    `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M4.27748 0.275664C4.64745 -0.0918881 5.24729 -0.0918881 5.61726 0.275664L12.7225 7.33449C13.0925 7.70204 13.0925 8.29796 12.7225 8.66551L5.61726 15.7243C5.24729 16.0919 4.64745 16.0919 4.27748 15.7243C3.90751 15.3568 3.90751 14.7609 4.27748 14.3933L10.7129 8L4.27748 1.60669C3.90751 1.23914 3.90751 0.643216 4.27748 0.275664Z" fill="${fgColor}"/></svg>`,
};
