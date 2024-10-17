import editorTemplateImages from '~/lib/editorTemplateImages';

export default function TemplateImagePicker({onChange}: {onChange: ((dataUrlBlob: string) => void)})  {
  return (
    <div className='flex flex-row flex-wrap gap-3'>
      {editorTemplateImages.map((templateImage) => (
        <button className='h-20 w-20 text-center' onClick={() => onChange(templateImage.data)} key={templateImage.id}>
          <img className='aspect-square h-full w-full mx-auto block object-cover' src={templateImage.data} alt='a background image' />
        </button>
      ))}
    </div>
  );
}
