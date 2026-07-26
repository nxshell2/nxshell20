<template>
	<div id="app" class="main-window">
		<nx-layout>
			<template #main-panel>
				<router-view v-slot="{ Component }">
					<keep-alive>
						<component :is="Component" />
					</keep-alive>
				</router-view>
			</template>
		</nx-layout>
	</div>
</template>

<script setup>
import NxLayout from '@/layout/NxLayout.vue'
import { useSettingStore } from '@/store'
import { storeToRefs } from 'pinia'
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'

const settingStore = useSettingStore()
const { theme } = storeToRefs(settingStore)
const router = useRouter()
onMounted(() => {
	settingStore.changeTheme(theme.value)
	if (process.env.NODE_ENV !== 'development') {
		router.push({ name: 'Home' })
	}
})
</script>

<style lang="scss">
#app {
	width: 100%;
	height: 100%;
	background-color: var(--n-bg-color-light);

	.control-panel {
		width: 100%;
		height: 100%;
	}

	.main-window {
		.control-panel {
			background-color: var(--n-bg-color-light);
		}
	}
}
</style>
