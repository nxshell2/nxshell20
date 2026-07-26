<template>
	<div class="pt-menu">
		<pt-menu-item v-for="(item, idx) in menu" :key="idx" :item="item" :translate="translate" />
	</div>
</template>

<script>
import { getLastMenuId, pushMenu } from "./menuManager";
import PtMenuItem from "./menuitem.vue";
export default {
	name: "PtMenu",
	components: {
		PtMenuItem
	},
	props: {
		menu: {
			type: Array,
			required: true
		},
		translate: {
			type: Boolean,
			default: false
		},
		parent: Object
	},

	data() {
		return {
			id: getLastMenuId()
		}
	},

	created() {
		pushMenu(this);
	}
}
</script>

<style lang="scss">
@use "../../assets/scss/_const.scss" as *;

.pt-menu {
	position: relative;
	z-index: $menuZIndex;
	min-width: 180px;
	border-radius: 4px;
	padding-bottom: 5px;
	background-color: var(--n-color-modal);
	box-shadow: 2px 2px 30px 1px rgba(0, 0, 0, .2);
}
</style>