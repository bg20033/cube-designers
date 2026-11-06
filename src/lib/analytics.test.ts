import { describe, expect, it } from 'vitest'
import { filterAnalyticsEvent } from './analytics'

describe('analytics privacy', () => {
  it('keeps private invitation credentials out of page views', () => {
    expect(filterAnalyticsEvent({ type: 'pageview', url: 'https://www.cube-designers.com/ftesa?token=private#guest=private' })?.url).toBe('https://www.cube-designers.com/ftesa')
  })
  it('excludes admin activity on any origin', () => {
    for (const path of ['/admin', '/admin/orders']) {
      expect(filterAnalyticsEvent({ type: 'pageview', url: `https://shop.cube-designers.com${path}` })).toBeNull()
    }
  })
})
