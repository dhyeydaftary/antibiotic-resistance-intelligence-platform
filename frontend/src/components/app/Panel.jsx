function Panel({ children, className = '', raised = false, as: Tag = 'div', ...rest }) {
  return (
    <Tag
      className={`rounded-[20px] border border-panel-border bg-panel shadow-panel-md ${raised ? 'bg-panel-raised' : ''} ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export default Panel;