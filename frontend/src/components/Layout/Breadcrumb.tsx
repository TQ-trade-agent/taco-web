import { Link, useMatches } from 'react-router-dom'
import { Breadcrumb } from 'antd'

export default function BreadcrumbNav() {
  const matches = useMatches()

  const items = matches
    .filter((m) => (m.handle as { title?: string } | undefined)?.title)
    .map((m) => {
      const title = (m.handle as { title: string }).title
      const to = m.pathname
      return { title: to === '/' ? <Link to="/dashboard">{title}</Link> : <Link to={to}>{title}</Link> }
    })

  return <Breadcrumb items={items} />
}
