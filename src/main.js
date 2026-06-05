import Vue from 'vue'
import App from './App.vue'
import router from './router'
import './styles/global.scss'
import {
  Button,
  Input,
  DatePicker,
  Select,
  Option,
  Radio,
  RadioGroup,
  RadioButton,
  Table,
  TableColumn,
  Pagination,
  Dialog,
  Form,
  FormItem,
  MessageBox,
  Message,
  Loading,
  Tabs,
  TabPane,
  Card,
  Row,
  Col,
  Tag,
  Icon,
  Dropdown,
  DropdownMenu,
  DropdownItem,
  Menu,
  MenuItem,
  ColorPicker,
  Upload,
  Empty,
  Alert,
  Progress
} from 'element-ui'

Vue.use(Button)
Vue.use(Input)
Vue.use(DatePicker)
Vue.use(Select)
Vue.use(Option)
Vue.use(Radio)
Vue.use(RadioGroup)
Vue.use(RadioButton)
Vue.use(Table)
Vue.use(TableColumn)
Vue.use(Pagination)
Vue.use(Dialog)
Vue.use(Form)
Vue.use(FormItem)
Vue.use(Tabs)
Vue.use(TabPane)
Vue.use(Card)
Vue.use(Row)
Vue.use(Col)
Vue.use(Tag)
Vue.use(Icon)
Vue.use(Dropdown)
Vue.use(DropdownMenu)
Vue.use(DropdownItem)
Vue.use(Menu)
Vue.use(MenuItem)
Vue.use(ColorPicker)
Vue.use(Upload)
Vue.use(Empty)
Vue.use(Alert)
Vue.use(Progress)

Vue.prototype.$message = Message
Vue.prototype.$confirm = MessageBox.confirm
Vue.prototype.$loading = Loading.service

Vue.config.productionTip = false

new Vue({
  router,
  render: h => h(App)
}).$mount('#app')
