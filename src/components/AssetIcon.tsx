import type { ZenithAsset } from '../types'

export function AssetIcon({ asset, size = 'medium' }: { asset: ZenithAsset; size?: 'small' | 'medium' | 'large' }) {
  return (
    <span
      className={`asset-icon asset-icon--${size}`}
      style={{ '--asset-color': asset.color } as React.CSSProperties}
      aria-hidden="true"
    >
      {asset.symbol.slice(0, asset.symbol.length > 3 ? 1 : 2)}
    </span>
  )
}
