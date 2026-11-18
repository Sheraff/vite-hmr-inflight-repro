// a.js imports itself, as every module does under @vitejs/plugin-react's Fast Refresh
import * as self from '/a.js'
import { b } from './b.js'

export const a = 1

import.meta.hot?.accept()
