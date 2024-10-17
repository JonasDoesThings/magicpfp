import editorTemplateImages from '~/lib/editorTemplateImages';

export default function TemplateImagePicker({className, onChange}: {className?: string; onChange: ((dataUrlBlob: string) => void)})  {
  return (
    <div className={className}>
      <div className='flex flex-row flex-wrap gap-3'>
        {Object.entries(editorTemplateImages).map(([templateImageId, templateImage]) => (
          <button className='h-20 w-20 text-center' onClick={() => onChange(templateImage.data)} key={templateImageId}>
            <img className='aspect-square h-full w-full mx-auto block object-cover' src={templateImage.data}
              alt='a background image' />
          </button>
        ))}
      </div>
      <p className='text-gray-400 mt-1 text-xs'>Images provided by <a className='underline' href='https://unsplash.com/@vinhundred' target='_blank' rel='nofollow'>@vinhundred</a>.</p>
    </div>
  );
}
