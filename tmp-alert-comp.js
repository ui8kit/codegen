import { defineComponent as _defineComponent } from 'vue'
import { unref as _unref, renderSlot as _renderSlot, mergeProps as _mergeProps, openBlock as _openBlock, createElementBlock as _createElementBlock } from "vue"

const _hoisted_1 = ["role", "aria-live"]

import { computed, useAttrs } from "vue";
import { alertClasses, type AlertVariant } from "./alert.shared";
import { defaultIfEmpty, oneOfOr } from "../../utils/expr";


export default /*@__PURE__*/_defineComponent({
  ...{ name: "Alert", inheritAttrs: false },
  __name: 'Alert',
  props: {
    variant: { type: null, required: false },
    role: { type: String, required: false },
    ariaLive: { type: String, required: false }
  },
  setup(__props: any) {



const props = __props;

const attrs = useAttrs();
const callerClass = computed(() => attrs.class as string | undefined);
const restAttrs = computed(() => {
  const { class: _class, ...restEntries } = attrs;
  return restEntries;
});
const cls = computed(() => alertClasses({ variant: props.variant, className: callerClass.value }));

return (_ctx: any,_cache: any) => {
  return (_openBlock(), _createElementBlock("div", _mergeProps({
    class: cls.value || undefined,
    role: _unref(oneOfOr)(props.role, 'status', 'status', 'alert'),
    "aria-live": _unref(defaultIfEmpty)(props.ariaLive, 'polite')
  }, restAttrs.value), [
    _renderSlot(_ctx.$slots, "default")
  ], 16 /* FULL_PROPS */, _hoisted_1))
}
}

})