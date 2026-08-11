<template>
	<SessionFormLayout
		ref="formLayoutRef"
		protocol="Serial"
		:rules="serialFormRules"
		:default-form="defaultForm"
		description="serial session"
		:form-data="formData"
		@save="handleSave"
		@save-and-connect="handleSaveAndConnect"
		@cancel="handleCancel"
	>
		<template #base>
			<el-row :gutter="10">
				<el-col :span="12">
					<el-form-item :label="$t('home.profile.serial.port.title')" prop="port">
						<el-select v-model="formData.port" style="width: 100%">
							<el-option
								v-for="(item, index) in serialPorts"
								:key="index"
								:label="item.path || item"
								:value="item.path || item"
							>
								{{ item.path || item }}
							</el-option>
						</el-select>
					</el-form-item>
				</el-col>
				<el-col :span="12">
					<el-form-item :label="$t('home.profile.serial.baudRate.title')" prop="baudRate">
						<el-select v-model="formData.baudRate" allow-create filterable>
							<el-option
								v-for="item in baudRateOptions"
								:key="item.value"
								:label="item.label"
								:value="item.value"
							/>
						</el-select>
					</el-form-item>
				</el-col>
			</el-row>
			<el-row :gutter="10">
				<el-col :span="12">
					<el-form-item :label="$t('home.profile.serial.dataBits.title')" prop="dataBits">
						<el-select v-model="formData.dataBits">
							<el-option
								v-for="item in dataBitsOptions"
								:key="item.value"
								:label="item.label"
								:value="item.value"
							/>
						</el-select>
					</el-form-item>
				</el-col>
				<el-col :span="12">
					<el-form-item :label="$t('home.profile.serial.stopBits.title')" prop="stopBits">
						<el-select v-model="formData.stopBits">
							<el-option
								v-for="item in stopBitsOptions"
								:key="item.value"
								:label="item.label"
								:value="item.value"
							/>
						</el-select>
					</el-form-item>
				</el-col>
			</el-row>
			<el-row :gutter="10">
				<el-col :span="12">
					<el-form-item :label="$t('home.profile.serial.parity.title')" prop="parity">
						<el-select v-model="formData.parity">
							<el-option
								v-for="item in parityOptions"
								:key="item.value"
								:label="item.label"
								:value="item.value"
							/>
						</el-select>
					</el-form-item>
				</el-col>
				<el-col :span="12">
					<el-form-item :label="$t('home.profile.serial.flowControl.title')" prop="flowControl">
						<el-select v-model="formData.flowControl">
							<el-option
								v-for="item in flowControlOptions"
								:key="item.value"
								:label="item.label"
								:value="item.value"
							/>
						</el-select>
					</el-form-item>
				</el-col>
			</el-row>
		</template>
	</SessionFormLayout>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { publish } from '@/services/eventbus'
import { SESSION_CONFIG_TYPE, SessionConfig } from '@/services/sessionMgr'
import sessionManager from '@/services/sessionMgr'
import { useSessionStore } from '@/store'
import SessionFormLayout from '../SessionFormLayout.vue'
import {
	defaultForm,
	baudRateOptions,
	parityOptions,
	flowControlOptions,
	dataBitsOptions,
	stopBitsOptions
} from './constants'

const { t } = useI18n()
const emits = defineEmits(['ok', 'cancel'])
const sessionStore = useSessionStore()
const formLayoutRef = ref()
const deepClone = (obj) => JSON.parse(JSON.stringify(obj || {}))
const formData = ref(deepClone(defaultForm))
const serialPorts = ref(['COM1'])
const sessionInstance = window.powertools.getService()

const serialFormRules = {
	hostName: [{ required: true, message: t('home.profile.base.host-name.required'), trigger: 'blur' }],
	port: [{ required: true, message: t('components.session.serial.portRequired'), trigger: 'blur' }]
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
			'serial session'
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

onMounted(async () => {
	serialPorts.value = await sessionInstance.getSerialPorts()
})

defineExpose({ showModal })
</script>
