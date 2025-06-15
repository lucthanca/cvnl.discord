/** @type {import("prettier").Config} */
module.exports = {
  semi: true, // chấm phẩy là chân ái
  singleQuote: true, // nháy đơn cho ngầu
  trailingComma: 'all', // dấu phẩy cuối danh sách — thêm mà không lỗi, xoá mà không đau
  printWidth: 100, // dòng dài hơn 100 ký tự là bị cắt, kẻo phải lướt ngang mỏi cổ
  tabWidth: 2, // 2 spaces là chân lý
  useTabs: false, // space gang 2 cái thay vì tab
  bracketSpacing: true, // có khoảng trắng trong dấu ngoặc: { like this }
  arrowParens: 'avoid', // function oneParam => no parens
  endOfLine: 'auto', // để nó tự quyết định EOL cho khỏi toang trên Windows/Linux
};