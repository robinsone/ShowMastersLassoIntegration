import { readMultipartFormData, createError } from 'h3'
import { parseCSVContent } from '../utils/lasso'

export default defineEventHandler(async (event) => {
  const formData = await readMultipartFormData(event)

  if (!formData || formData.length === 0) {
    throw createError({ statusCode: 400, message: 'No form data received.' })
  }

  const filePart = formData.find(p => p.name === 'file')
  if (!filePart) {
    throw createError({ statusCode: 400, message: 'Missing "file" field in form data.' })
  }

  const content = filePart.data.toString('utf-8')

  try {
    const jobs = parseCSVContent(content)
    return { jobs }
  } catch (err: any) {
    throw createError({ statusCode: 422, message: err.message ?? 'Failed to parse CSV.' })
  }
})
