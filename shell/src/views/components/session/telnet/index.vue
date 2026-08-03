<template>
	<SessionFormLayout
		ref="formLayoutRef"
		protocol="Telnet"
		:rules="telnetFormRules"
		:default-form="defaultForm"
		description="telnet session"
		:form-data="formData"
		@save="handleSave"
		@save-and-connect="handleSaveAndConnect"
		@cancel="handleCancel"
	>
		<template #base>
			<el-row :gutter="10">
				<el-col :span="12">
					<el-form-item :label="$t('home.profile.base.host.title')" prop="hostAddress">
						<el-input v-model="formData.hostAddress" />
					</el-form-item>
				</el-col>
				<el-col :span="12">
					<el-form-item :label="$t('home.profile.base.port.title')" prop="hostTelnetPort">
						<el-input-number v-model="formData.hostTelnetPort" :min="1" :max="65535" controls-position="right"/>
					</el-form-item>
				</el-col>
			</el-row>
		</template>
	</SessionFormLayout>
</template>

<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { publish } from '@/services/eventbus'
import { SESSION_CONFIG_TYPE, SessionConfig } from '@/services/sessionMgr'
import sessionManager from '@/services/sessionMgr'
import { useSessionStore } from '@/store'
import SessionFormLayout from '../SessionFormLayout.vue'
import { defaultForm } from './constants'

const { t } = useI18n()
const emits = defineEmits(['ok', 'cancel'])
const sessionStore = useSessionStore()
const formLayoutRef = ref()
const deepClone = (obj) => JSON.parse(JSON.stringify(obj || {}))
const formData = ref(deepClone(defaultForm))

const telnetFormRules = {
	hostName: [{ required: true, message: t('home.profile.base.host-name.required'), trigger: 'blur' }],
	hostAddress: [{ required: true, message: t('home.profile.base.host.placeholder'), trigger: 'blur' }],
	hostTelnetPort: [{ required: true, message: t('home.profile.base.port.placeholder'), trigger: 'blur' }]
}

const saveOrUpdateSession = async () => {
	const layout = formLayoutRef.value
	const formVal = layout.getFormData()
	const isEdit = layout.getIsEdit()
	let sessionConfig = layout.getSessionConfig()
	const sessionName = formVal.hostName

	if (isEdit) {
		sessionConfig.update(sessionName, Object.assign(sessionConfig.config, formVal), '')
	} else {
		const newConfig = new SessionConfig(
			sessionName,
			SESSION_CONFIG_TYPE.NODE,
			deepClone(formVal),
			'telnet session'
		)
		await sessionStore.appendSessionConfig(newConfig)
		sessionConfig = newConfig
	}
	publish('refresh-session-tree')
	return { formVal, sessionConfig, isEdit }
}

const handleSave = async () => {
	const { formVal } = await saveOrUpdateSession()
	formLayoutRef.value?.close()
	emits('ok', formVal)
}

const handleSaveAndConnect = async () => {
	const { formVal, sessionConfig } = await saveOrUpdateSession()
	await sessionManager.createSessionInstance(sessionConfig)
	formLayoutRef.value?.close()
	emits('ok', formVal)
}

const handleCancel = () => {
	emits('cancel')
}

const showModal = (sessionId) => {
	for (const key of Object.keys(formData.value)) {
		delete formData.value[key]
	}
	Object.assign(formData.value, deepClone(defaultForm))
	formLayoutRef.value?.showModal(sessionId)
}

defineExpose({ showModal })
</script>
