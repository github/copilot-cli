using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Text.Json;
using System.Windows.Automation;

namespace UIAWrapper
{
    class Program
    {
        [DllImport("user32.dll")]
        static extern IntPtr GetForegroundWindow();

        static void Main(string[] args)
        {
            IntPtr handle = GetForegroundWindow();
            if (handle == IntPtr.Zero) return;

            AutomationElement root = AutomationElement.FromHandle(handle);
            var node = BuildTree(root);

            string json = JsonSerializer.Serialize(node, new JsonSerializerOptions { WriteIndented = true });
            Console.WriteLine(json);
        }

        static UIANode BuildTree(AutomationElement element)
        {
            var rectangle = element.Current.BoundingRectangle;
            var node = new UIANode
            {
                id = element.Current.AutomationId,
                name = element.Current.Name,
                role = element.Current.ControlType.ProgrammaticName.Replace("ControlType.", ""),
                bounds = new Bounds
                {
                    x = SafeNumber(rectangle.X),
                    y = SafeNumber(rectangle.Y),
                    width = SafeNumber(rectangle.Width),
                    height = SafeNumber(rectangle.Height)
                },
                isClickable = (bool)element.GetCurrentPropertyValue(AutomationElement.IsInvokePatternAvailableProperty) || element.Current.IsKeyboardFocusable,
                isFocusable = element.Current.IsKeyboardFocusable,
                children = new List<UIANode>()
            };

            var walker = TreeWalker.ControlViewWalker;
            var child = walker.GetFirstChild(element);
            while (child != null)
            {
                try
                {
                    if (!child.Current.IsOffscreen)
                    {
                        node.children.Add(BuildTree(child));
                    }
                }
                catch (ElementNotAvailableException) { }
                
                child = walker.GetNextSibling(child);
            }

            return node;
        }

        static double SafeNumber(double value)
        {
            return double.IsFinite(value) ? value : 0;
        }
    }

    class UIANode
    {
        public string id { get; set; }
        public string name { get; set; }
        public string role { get; set; }
        public Bounds bounds { get; set; }
        public bool isClickable { get; set; }
        public bool isFocusable { get; set; }
        public List<UIANode> children { get; set; }
    }

    class Bounds
    {
        public double x { get; set; }
        public double y { get; set; }
        public double width { get; set; }
        public double height { get; set; }
    }
}